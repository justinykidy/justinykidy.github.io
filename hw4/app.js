import { resizeAspectRatio, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';


let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let axes;
let lastTime = 0;


let sunRotation = 0;
let earthOrbitRotation = 0;
let earthSelfRotation = 0;
let moonOrbitRotation = 0;
let moonSelfRotation = 0;


const SUN_COLOR = [1.0, 0.0, 0.0, 1.0];    // Red
const EARTH_COLOR = [0.0, 1.0, 1.0, 1.0];  // Cyan
const MOON_COLOR = [1.0, 1.0, 0.0, 1.0];   // Yellow


const SUN_SIZE = 0.2;
const EARTH_SIZE = 0.1;
const MOON_SIZE = 0.05;


const EARTH_ORBIT_RADIUS = 0.7;
const MOON_ORBIT_RADIUS = 0.2;


const SUN_ROTATION_SPEED = 45 * Math.PI / 180;
const EARTH_ORBIT_SPEED = 30 * Math.PI / 180;
const EARTH_ROTATION_SPEED = 180 * Math.PI / 180;
const MOON_ORBIT_SPEED = 360 * Math.PI / 180;
const MOON_ROTATION_SPEED = 180 * Math.PI / 180;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('Program terminated.');
            return;
        }
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch(error => {
        console.error('Error during program execution:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    
    
    return true;
}

function setupBuffers() {

    const squareVertices = new Float32Array([
        -0.5,  0.5, 0.0,  
        -0.5, -0.5, 0.0,  
         0.5, -0.5, 0.0,  
         0.5,  0.5, 0.0   
    ]);

    const indices = new Uint16Array([
        0, 1, 2,    
        0, 2, 3     
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);


    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, squareVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 3, gl.FLOAT, false, 0, 0);


    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}

function createModelMatrix(translation, rotation, scale) {
    const modelMatrix = mat4.create();
    

    mat4.translate(modelMatrix, modelMatrix, translation);
    mat4.rotate(modelMatrix, modelMatrix, rotation, [0, 0, 1]);
    mat4.scale(modelMatrix, modelMatrix, scale);
    
    return modelMatrix;
}

function drawObject(modelMatrix, color) {
    shader.use();
    shader.setMat4("u_model", modelMatrix);
    shader.setVec4("u_color", color);
    
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);


    axes.draw(mat4.create(), mat4.create());


    const sunModelMatrix = createModelMatrix(
        [0, 0, 0],                
        sunRotation,              
        [SUN_SIZE, SUN_SIZE, 1]   
    );
    drawObject(sunModelMatrix, SUN_COLOR);


    const earthX = EARTH_ORBIT_RADIUS * Math.cos(earthOrbitRotation);
    const earthY = EARTH_ORBIT_RADIUS * Math.sin(earthOrbitRotation);
    

    const earthModelMatrix = createModelMatrix(
        [earthX, earthY, 0],          
        earthSelfRotation,            
        [EARTH_SIZE, EARTH_SIZE, 1]   
    );
    drawObject(earthModelMatrix, EARTH_COLOR);


    const moonX = earthX + MOON_ORBIT_RADIUS * Math.cos(moonOrbitRotation);
    const moonY = earthY + MOON_ORBIT_RADIUS * Math.sin(moonOrbitRotation);
    

    const moonModelMatrix = createModelMatrix(
        [moonX, moonY, 0],          
        moonSelfRotation,           
        [MOON_SIZE, MOON_SIZE, 1]   
    );
    drawObject(moonModelMatrix, MOON_COLOR);
}

function animate(currentTime) {
    if (!lastTime) lastTime = currentTime;

    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;


    sunRotation += SUN_ROTATION_SPEED * deltaTime;
    earthOrbitRotation += EARTH_ORBIT_SPEED * deltaTime;
    earthSelfRotation += EARTH_ROTATION_SPEED * deltaTime;
    moonOrbitRotation += MOON_ORBIT_SPEED * deltaTime;
    moonSelfRotation += MOON_ROTATION_SPEED * deltaTime;

    render();
    requestAnimationFrame(animate);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL initialization failed');
        }
        
        await initShader();
        setupBuffers();
        axes = new Axes(gl, 1.0);

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('Program initialization failed.');
        return false;
    }
}
