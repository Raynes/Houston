require('babel-core/polyfill')

var hue = require('node-hue-api');
var convertRGBtoXY = require('node-hue-api/hue-api/rgb').convertRGBtoXY;
var restify = require('restify');
var fs = require("fs");

var bridge = new Promise((resolve, reject) => {
  hue.nupnpSearch((err, bridgeFound) => {
    if (err || bridgeFound === null) reject(err);
    resolve(bridgeFound[0].ipaddress)
  });
});

var config = JSON.parse(fs.readFileSync("config.json"));

function parseColors(colorJson) {
  let colors = JSON.parse(colorJson);
  let outputColors = {};

  Object.keys(colors).forEach(colorId => {
    let color = colors[colorId];
    outputColors[color.name.toLowerCase()] = color.rgb;
  });

  return outputColors;
}

var colors = parseColors(fs.readFileSync("colors.json"));

function findLightByName(lights, target) {
  return lights.find(({name}) => name.toLowerCase() === target)
}

function findLights(api, name) {
  return api.lights()
    .then(({lights}) => {
      let light = findLightByName(lights, name);
      if (light) {
        return light;
      } else {
        return api.lightGroups()
          .then(groups => {
            let group = findLightByName(groups, name);
            if (group) {
              return group;
            } else {
              throw {"message": "Can't find a light or group by that name!"}
            }
          });
      }
    });
}

function getSetStateFn(api, target) {
  if (target.type === "LightGroup") {
    return api.setGroupLightState;
  } else {
    return api.setLightState
  }
}

bridge.then((ip) => {
  let api = new hue.HueApi(ip, config.user);
  let server = restify.createServer({
    name: 'myapp',
    version: '1.0.0'
  });

  function setColor(req, res, next) {
    let {body: {target, color}} = req;
    target = target.toLowerCase();
    let rgb = colors[color.toLowerCase()];

    if (rgb) {
      findLights(api, target)
        .then(light => {
          let [x, y] = convertRGBtoXY(rgb);
          let lightState = hue.lightState.create()
            .on(true)
            .xy(x, y)
            .transitionFast();

          if (light) {
            getSetStateFn(api, light).call(api, light.id, lightState, (err, results) => {
              if (err) {
                console.error(err);
                res.send(400, "There was an error setting the state of the lights");
                return next();
              } else {
                let msg = `Setting ${light.name} to ${color}`;
                console.log(msg);
                res.send(200, msg);
                return next();
              }
            });
          } else {
            res.send(404, "Light not found!");
            return next();
          }
        })
        .fail(err => {
          var output = "";
          if (err.message) {
            output = err.message
          } else {
            output = "Failed to find lights"
          }

          res.send(400, output);
          return next();
        })
        .done();
      } else {
        res.send(400, "Color not found!");
        return next();
      }
  }

  server.use(restify.queryParser());
  server.use(restify.bodyParser());

  server.post("/setcolor", setColor);

  server.listen(config['port'] || 8080, () => console.log("Listening..."));
});
