# Local 3D renderer dependencies

Three.js **0.170.0**, MIT license, downloaded from the official npm package through jsDelivr. `LICENSE.txt` contains the license.

Files: `three.module.js`, `GLTFLoader.js`, `BufferGeometryUtils.js`, `RoomEnvironment.js`, `meshopt_decoder.module.js`.

Three addon imports were changed only from the bare `three` specifier to `./three.module.js`; GLTFLoader's utility import points to `./BufferGeometryUtils.js`. This module is independent of the older global Three used by the cosmic background.

The meshoptimizer decoder distributed with Three carries its MIT copyright/license header. Source: https://github.com/zeux/meshoptimizer . No KTX2 transcoder, remote CDN request, or import map is needed at runtime.
