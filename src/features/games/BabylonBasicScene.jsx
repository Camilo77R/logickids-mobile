import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export default function BabylonBasicScene() {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
          #renderCanvas { width: 100%; height: 100%; touch-action: none; }
        </style>
        <script src="https://cdn.babylonjs.com/babylon.js"></script>
      </head>
      <body>
        <canvas id="renderCanvas"></canvas>
        <script>
          const canvas = document.getElementById("renderCanvas");
          const engine = new BABYLON.Engine(canvas, true);
          const createScene = function () {
            const scene = new BABYLON.Scene(engine);
            scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
            const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);
            camera.setTarget(BABYLON.Vector3.Zero());
            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
            light.intensity = 0.8;
            const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 3, segments: 32}, scene);
            sphere.position.y = 1.5;
            const material = new BABYLON.StandardMaterial("material", scene);
            material.emissiveColor = new BABYLON.Color3(0.2, 0.5, 1);
            sphere.material = material;
            scene.onBeforeRenderObservable.add(() => {
              sphere.rotation.y += 0.02 * scene.getAnimationRatio();
              sphere.position.y = 1.5 + Math.sin(performance.now() * 0.003) * 0.5;
            });
            return scene;
          };
          const scene = createScene();
          engine.runRenderLoop(function () {
            scene.render();
          });
          window.addEventListener("resize", function () {
            engine.resize();
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Motor 3D Activo (WebView)</Text>
      <View style={styles.engineContainer}>
        <WebView source={{ html: htmlContent }} scrollEnabled={false} bounces={false} style={styles.webview} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  engineContainer: { width: 300, height: 300, borderRadius: 15, overflow: 'hidden', borderWidth: 2, borderColor: '#4A90E2', backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: 'transparent' }
});