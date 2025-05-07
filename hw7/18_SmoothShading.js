/*--------------------------------------------------------------------------------
18_SmoothShading.js (User Modified for Cone and Phong/Gouraud Shading)

- Viewing a 3D unit cone at origin with perspective projection
- Rotating the cone by ArcBall interface (by left mouse button dragging)
- Keyboard controls:
    - 'a' to switch between camera and model rotation modes in ArcBall interface
    - 'r' to reset arcball
    - 's' to switch to smooth shading
    - 'f' to switch to flat shading
    - 'g' to switch to Gouraud rendering
    - 'p' to switch to Phong rendering
- Applying Diffuse & Specular reflection using Flat/Smooth shading and Phong/Gouraud rendering to the cone
----------------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText} from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';
import { Cube } from '../util/cube.js';
import { Arcball } from '../util/arcball.js';
import { Cone } from './cone.js'; // Assuming cone.js is in the same directory or configured path

// WebGL context and canvas element
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

// Shaders
let shader; // Current active shader for the cone
let lampShader;
let phongShader;
let gouraudShader;

// Text overlay elements for displaying information
let arcballModeDisplay;
let shadingInfoDisplay;
let helpTextArcballMode;
let helpTextResetArcball;
let helpTextSmoothShading;
let helpTextFlatShading;
let helpTextGouraud;
let helpTextPhong;

// Initialization flag
let isInitialized = false;

// Matrices
let viewMatrix = mat4.create();
let projMatrix = mat4.create();
let modelMatrix = mat4.create();
let lampModelMatrix = mat4.create();

// Control states
let arcBallMode = 'CAMERA'; 
let shadingMode = 'FLAT'; 
let renderingMode = 'PHONG'; 

// 3D Objects
const cone = new Cone(gl, 32); 
const lamp = new Cube(gl);     


// Scene parameters
const cameraPos = vec3.fromValues(0, 0, 3); 
const lightPos = vec3.fromValues(1.0, 0.7, 1.0);
const lightSize = vec3.fromValues(0.1, 0.1, 0.1);

// Arcball controls
const arcball = new Arcball(canvas, 5.0, { rotation: 2.0, zoom: 0.0005 });

// Ensures the main function runs once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log('Already initialized');
        return;
    }

    main()
        .then(success => {
            if (!success) {
                console.log('Program terminated');
                return;
            }
            isInitialized = true;
        })
        .catch(error => {
            console.error('Program terminated with error:', error);
        });
});


function updateActiveShader() {
    shader = renderingMode === 'PHONG' ? phongShader : gouraudShader;
    shader.use();
    shader.setMat4('u_projection', projMatrix);
    shader.setVec3('material.diffuse', vec3.fromValues(1.0, 0.5, 0.31));
    shader.setVec3('material.specular', vec3.fromValues(0.5, 0.5, 0.5));
    shader.setFloat('material.shininess', 16);
    shader.setVec3('light.position', lightPos);
    shader.setVec3('light.ambient', vec3.fromValues(0.2, 0.2, 0.2));
    shader.setVec3('light.diffuse', vec3.fromValues(0.7, 0.7, 0.7));
    shader.setVec3('light.specular', vec3.fromValues(1.0, 1.0, 1.0));
    shader.setVec3('u_viewPos', cameraPos);
}


function setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
        if (event.key === 'a') {
            arcBallMode = (arcBallMode === 'CAMERA') ? 'MODEL' : 'CAMERA';
            updateText(arcballModeDisplay, 'arcball mode: ' + arcBallMode);
        } else if (event.key === 'r') {
            arcball.reset();
            modelMatrix = mat4.create();
            arcBallMode = 'CAMERA';
            updateText(arcballModeDisplay, 'arcball mode: ' + arcBallMode);
        } else if (event.key === 's') {
            cone.copyVertexNormalsToNormals();
            cone.updateNormals();
            shadingMode = 'SMOOTH';
            render(); 
        } else if (event.key === 'f') {
            cone.copyFaceNormalsToNormals();
            cone.updateNormals();
            shadingMode = 'FLAT';
            render(); 
        } else if (event.key === 'g') {
            renderingMode = 'GOURAUD';
        } else if (event.key === 'p') {
            renderingMode = 'PHONG';
        }

        // Update text display for shading and rendering mode
        updateText(shadingInfoDisplay, 'shading mode: ' + shadingMode + ' (' + renderingMode + ')');
        // Update shader if rendering mode changed or potentially for other reasons
        updateActiveShader();
    });
}


function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas); // Adjust viewport for aspect ratio
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0); // Set default clear color

    return true;
}

async function initLampShader() {
    const vertexShaderSource = await readShaderFile('shLampVert.glsl');
    const fragmentShaderSource = await readShaderFile('shLampFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}


async function initShaders() {
    const vsPhongSrc = await readShaderFile('phongVert.glsl');
    const fsPhongSrc = await readShaderFile('phongFrag.glsl');
    phongShader = new Shader(gl, vsPhongSrc, fsPhongSrc);

    const vsGouraudSrc = await readShaderFile('gouraudVert.glsl');
    const fsGouraudSrc = await readShaderFile('gouraudFrag.glsl');
    gouraudShader = new Shader(gl, vsGouraudSrc, fsGouraudSrc);
}


function render() {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);


    if (arcBallMode === 'CAMERA') {
        viewMatrix = arcball.getViewMatrix();
    } else { 
        modelMatrix = arcball.getModelRotMatrix();
        viewMatrix = arcball.getViewCamDistanceMatrix();
    }


    shader.use(); 
    shader.setMat4('u_model', modelMatrix);
    shader.setMat4('u_view', viewMatrix);

    cone.draw(shader);


    lampShader.use();
    lampShader.setMat4('u_view', viewMatrix);

    lamp.draw(lampShader);

    requestAnimationFrame(render);
}


async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL initialization failed');
        }
        let initialViewMatrix = mat4.create();
        mat4.translate(initialViewMatrix, initialViewMatrix, vec3.negate(vec3.create(), cameraPos)); // Standard initial view

        mat4.translate(viewMatrix, viewMatrix, cameraPos); 

        mat4.perspective(
            projMatrix,
            glMatrix.toRadian(60),  
            canvas.width / canvas.height, 
            0.1,                        
            100.0                        
        );

        await initShaders();      
        lampShader = await initLampShader();


        renderingMode = 'PHONG'; 
        shadingMode = 'FLAT';   
        updateActiveShader();     


        lampShader.use();
        lampShader.setMat4('u_projection', projMatrix);

        mat4.identity(lampModelMatrix);
        mat4.translate(lampModelMatrix, lampModelMatrix, lightPos);
        mat4.scale(lampModelMatrix, lampModelMatrix, lightSize);
        lampShader.setMat4('u_model', lampModelMatrix);


        arcballModeDisplay = setupText(canvas, 'arcball mode: ' + arcBallMode);
        shadingInfoDisplay = setupText(canvas, 'shading mode: ' + shadingMode + ' (' + renderingMode + ')', 2);
        helpTextArcballMode = setupText(canvas, 'press \'a\' to change arcball mode', 3);
        helpTextResetArcball = setupText(canvas, 'press \'r\' to reset arcball', 4);
        helpTextSmoothShading = setupText(canvas, 'press \'s\' to switch to smooth shading', 5);
        helpTextFlatShading = setupText(canvas, 'press \'f\' to switch to flat shading', 6);
        helpTextGouraud = setupText(canvas, 'press \'g\' to switch to Gouraud shading', 7);
        helpTextPhong = setupText(canvas, 'press \'p\' to switch to Phong shading', 8);

 
        setupKeyboardEvents();


        requestAnimationFrame(render);

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('Failed to initialize program. Check console for details.');
        return false;
    }
}