export class Cone {

    constructor(gl, segments = 32, options = {}) {
        this.gl = gl;

        // VAO, VBO, EBO 생성
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        // 파라미터 설정
        const radius = 0.5;
        const tip = [0.0, 0.5, 0.0]; 
        const baseHeight = -0.5;    
        this.segments = segments;

        // 세그먼트별 각도 간격
        const angleStep = (2 * Math.PI) / segments;

    
        const positions = [];
        const normals = []; 
        const colors = [];
        const texCoords = [];
        const indices = [];


        const defaultColor = [0.8, 0.8, 0.8, 1.0];
        const colorOption = options.color || defaultColor;


        for (let i = 0; i < segments; i++) {
            const angle0 = i * angleStep;
            const angle1 = (i + 1) * angleStep;


            const x0 = radius * Math.cos(angle0);
            const z0 = radius * Math.sin(angle0);
            const x1 = radius * Math.cos(angle1);
            const z1 = radius * Math.sin(angle1);


            positions.push(
                tip[0], tip[1], tip[2], 
                x0, baseHeight, z0,     
                x1, baseHeight, z1      
            );


            const vecV_x = x1 - tip[0];
            const vecV_y = baseHeight - tip[1];
            const vecV_z = z1 - tip[2];

            const vecU_x = x0 - tip[0];
            const vecU_y = baseHeight - tip[1];
            const vecU_z = z0 - tip[2];


            const nx = vecV_y * vecU_z - vecV_z * vecU_y;
            const ny = vecV_z * vecU_x - vecV_x * vecU_z;
            const nz = vecV_x * vecU_y - vecV_y * vecU_x;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            const n = len > 0 ? [nx / len, ny / len, nz / len] : [0, 1, 0]; // 정규화, len=0 예외처리

            // 삼각형의 3개 정점에 동일한 Face Normal 지정
            for (let k = 0; k < 3; k++) normals.push(...n);

            // 색상 지정
            for (let k = 0; k < 3; k++) colors.push(...colorOption);

            // 텍스처 좌표 (임의의 값, 현재 셰이더에서 사용 여부에 따라 중요도 결정)
            texCoords.push(
                0.5, 1.0, 
                0.0, 0.0, 
                1.0, 0.0  
            );

            // 인덱스 추가 (각 삼각형마다 3개의 인덱스)
            const base = i * 3; // 각 삼각형의 시작 정점 인덱스
            indices.push(base, base + 1, base + 2);
        }

        // TypedArray로 변환
        this.vertices = new Float32Array(positions);
        this.normals = new Float32Array(normals); // 현재는 Face Normals 데이터
        this.colors = new Float32Array(colors);
        this.texCoords = new Float32Array(texCoords);
        this.indices = new Uint16Array(indices);

        // Flat/Smooth 셰이딩 전환을 위한 법선 데이터 백업
        this.faceNormals = new Float32Array(this.normals);
        this.vertexNormals = new Float32Array(this.vertices.length); 
        this.computeVertexNormals(); // Vertex Normals 계산

        // WebGL 버퍼 초기화
        this.initBuffers();
    }

    computeVertexNormals() {
        const vCount = this.vertices.length / 3;
        this.vertexNormals = new Float32Array(this.vertices.length); // Vertex normals를 담을 버퍼

        for (let i = 0; i < vCount; i++) {
            const x = this.vertices[i * 3 + 0];
            const y = this.vertices[i * 3 + 1]; 
            const z = this.vertices[i * 3 + 2];


            if (y > 0) { 
                this.vertexNormals[i * 3 + 0] = 0;
                this.vertexNormals[i * 3 + 1] = 1;
                this.vertexNormals[i * 3 + 2] = 0;
            } else {
                // 옆면 또는 밑면 정점: y축에 수직인 (x, 0, z) 방향을 정규화
                const len = Math.sqrt(x * x + z * z);
                if (len > 0) {
                    this.vertexNormals[i * 3 + 0] = x / len;
                    this.vertexNormals[i * 3 + 1] = 0; // y 컴포넌트를 0으로 설정
                    this.vertexNormals[i * 3 + 2] = z / len;
                } else {

                    this.vertexNormals[i * 3 + 0] = 0;
                    this.vertexNormals[i * 3 + 1] = (y > 0) ? 1 : -1; // y값에 따라 위 또는 아래
                    this.vertexNormals[i * 3 + 2] = 0;
                }
            }
        }
    }


    copyFaceNormalsToNormals() {
        this.normals.set(this.faceNormals);
    }


    copyVertexNormalsToNormals() {
        this.normals.set(this.vertexNormals);
    }


    initBuffers() {
        const gl = this.gl;


        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);


        let offset = 0;
        gl.bufferSubData(gl.ARRAY_BUFFER, offset, this.vertices);
        offset += vSize;
        gl.bufferSubData(gl.ARRAY_BUFFER, offset, this.normals);
        offset += nSize;
        gl.bufferSubData(gl.ARRAY_BUFFER, offset, this.colors);
        offset += cSize;
        gl.bufferSubData(gl.ARRAY_BUFFER, offset, this.texCoords);


        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);


        offset = 0;

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, offset);
        gl.enableVertexAttribArray(0);
        offset += vSize;


        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, offset);
        gl.enableVertexAttribArray(1);
        offset += nSize;


        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, offset);
        gl.enableVertexAttribArray(2);
        offset += cSize;


        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, offset);
        gl.enableVertexAttribArray(3);


        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

    }


    updateNormals() {
        const gl = this.gl;
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        const vSize = this.vertices.byteLength; 

        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }


    draw(shader) {
        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(
            gl.TRIANGLES,
            this.indices.length,   
            gl.UNSIGNED_SHORT,      
            0                       
        );
        gl.bindVertexArray(null); 
    }


    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ebo);
        gl.deleteVertexArray(this.vao);
    }
}