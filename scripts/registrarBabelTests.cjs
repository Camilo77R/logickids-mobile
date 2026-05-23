const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const raizProyecto = path.resolve(__dirname, '..');
const rutaSrc = `${path.sep}src${path.sep}`;
const cargadorOriginalJs = require.extensions['.js'];

require.extensions['.js'] = function registrarCompilacion(module, filename) {
  if (!filename.startsWith(raizProyecto) || filename.includes(`${path.sep}node_modules${path.sep}`)) {
    return cargadorOriginalJs(module, filename);
  }

  if (!filename.includes(rutaSrc)) {
    return cargadorOriginalJs(module, filename);
  }

  const codigoFuente = fs.readFileSync(filename, 'utf8');
  const codigoTransformado = babel.transformSync(codigoFuente, {
    filename,
    babelrc: false,
    configFile: false,
    presets: ['babel-preset-expo'],
    sourceMaps: 'inline',
  });

  module._compile(codigoTransformado.code, filename);
};
