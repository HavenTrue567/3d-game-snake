// Configuración de Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
scene.fog = new THREE.Fog(0x111111, 100, 300);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
document.body.appendChild(renderer.domElement);

// Iluminación
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 50, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.far = 200;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

// Plano del juego
const planeGeometry = new THREE.PlaneGeometry(40, 40);
const planeMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true;
scene.add(plane);

// Paredes
const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
const walls = [];

// Pared frontal
let wallGeom = new THREE.BoxGeometry(40, 2, 1);
let wall = new THREE.Mesh(wallGeom, wallMaterial);
wall.position.set(0, 1, -20);
wall.castShadow = true;
scene.add(wall);
walls.push(wall);

// Pared trasera
wall = new THREE.Mesh(wallGeom, wallMaterial);
wall.position.set(0, 1, 20);
wall.castShadow = true;
scene.add(wall);
walls.push(wall);

// Pared izquierda
wallGeom = new THREE.BoxGeometry(1, 2, 40);
wall = new THREE.Mesh(wallGeom, wallMaterial);
wall.position.set(-20, 1, 0);
wall.castShadow = true;
scene.add(wall);
walls.push(wall);

// Pared derecha
wall = new THREE.Mesh(wallGeom, wallMaterial);
wall.position.set(20, 1, 0);
wall.castShadow = true;
scene.add(wall);
walls.push(wall);

// Constantes del juego
const GRID_SIZE = 1;
const GRID_WIDTH = 40;
const GRID_HEIGHT = 40;
const SPEED = 5; // cuadros por segundo

// Objetos del juego
let snake = [
    { x: 0, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: -2, y: 0, z: 0 }
];

let direction = { x: 1, y: 0, z: 0 };
let nextDirection = { x: 1, y: 0, z: 0 };
let food = null;
let score = 0;
let gameRunning = true;
let gamePaused = false;

// Mallas de Three.js
const snakeMeshes = [];
let foodMesh = null;

// Función para crear un cubo de la serpiente
function createSnakeSegment(pos) {
    const geometry = new THREE.BoxGeometry(GRID_SIZE * 0.9, GRID_SIZE * 0.9, GRID_SIZE * 0.9);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00aa00,
        shininess: 100
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, pos.y + 0.5, pos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

// Función para crear la comida
function createFood() {
    if (foodMesh) {
        scene.remove(foodMesh);
    }
    
    let newFood;
    let validPosition = false;
    
    while (!validPosition) {
        newFood = {
            x: Math.floor(Math.random() * GRID_WIDTH) - GRID_WIDTH / 2,
            z: Math.floor(Math.random() * GRID_HEIGHT) - GRID_HEIGHT / 2,
            y: 0
        };
        
        validPosition = !snake.some(segment => 
            segment.x === newFood.x && segment.z === newFood.z
        );
    }
    
    food = newFood;
    
    const geometry = new THREE.SphereGeometry(GRID_SIZE * 0.5, 16, 16);
    const material = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff6600,
        shininess: 100
    });
    foodMesh = new THREE.Mesh(geometry, material);
    foodMesh.position.set(food.x, food.y + 0.5, food.z);
    foodMesh.castShadow = true;
    foodMesh.receiveShadow = true;
    scene.add(foodMesh);
    
    // Animación de rotación
    foodMesh.userData.rotating = true;
}

// Función para renderizar la serpiente
function renderSnake() {
    // Limpiar mallas antiguas
    snakeMeshes.forEach(mesh => scene.remove(mesh));
    snakeMeshes.length = 0;
    
    // Crear nuevas mallas
    snake.forEach((segment, index) => {
        const mesh = createSnakeSegment(segment);
        snakeMeshes.push(mesh);
    });
}

// Función para actualizar el HUD
function updateHUD() {
    document.getElementById('score').textContent = `Puntos: ${score}`;
    document.getElementById('length').textContent = `Longitud: ${snake.length}`;
}

// Función para detectar colisiones
function checkCollisions() {
    const head = snake[0];
    
    // Colisión con paredes
    if (head.x < -GRID_WIDTH / 2 || head.x > GRID_WIDTH / 2 ||
        head.z < -GRID_HEIGHT / 2 || head.z > GRID_HEIGHT / 2) {
        return true;
    }
    
    // Colisión con el cuerpo
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].z === head.z) {
            return true;
        }
    }
    
    return false;
}

// Control del juego
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Controles de dirección
    if (e.key.toLowerCase() === 'arrowup' || e.key.toLowerCase() === 'w') {
        if (direction.z === 0) nextDirection = { x: 0, y: 0, z: -1 };
    }
    if (e.key.toLowerCase() === 'arrowdown' || e.key.toLowerCase() === 's') {
        if (direction.z === 0) nextDirection = { x: 0, y: 0, z: 1 };
    }
    if (e.key.toLowerCase() === 'arrowleft' || e.key.toLowerCase() === 'a') {
        if (direction.x === 0) nextDirection = { x: -1, y: 0, z: 0 };
    }
    if (e.key.toLowerCase() === 'arrowright' || e.key.toLowerCase() === 'd') {
        if (direction.x === 0) nextDirection = { x: 1, y: 0, z: 0 };
    }
    
    // Pausa
    if (e.key === ' ') {
        e.preventDefault();
        gamePaused = !gamePaused;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Game Over
function endGame() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = `Puntos finales: ${score}`;
    document.getElementById('finalLength').textContent = `Longitud final: ${snake.length}`;
    document.getElementById('gameOver').style.display = 'block';
}

// Inicialización
renderSnake();
createFood();
updateHUD();

let gameTime = 0;
const gameSpeedInterval = 1000 / SPEED;

// Loop principal
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = 1000 / 60; // ~16ms a 60fps
    gameTime += deltaTime;
    
    if (!gameRunning) {
        renderer.render(scene, camera);
        return;
    }
    
    // Actualizar posición de la comida
    if (foodMesh && foodMesh.userData.rotating) {
        foodMesh.rotation.x += 0.05;
        foodMesh.rotation.y += 0.05;
        foodMesh.position.y = 0.5 + Math.sin(Date.now() * 0.002) * 0.3;
    }
    
    // Actualizar lógica del juego
    if (!gamePaused && gameTime >= gameSpeedInterval) {
        gameTime = 0;
        
        // Actualizar dirección
        direction = nextDirection;
        
        // Calcular nueva cabeza
        const head = snake[0];
        const newHead = {
            x: head.x + direction.x,
            y: head.y + direction.y,
            z: head.z + direction.z
        };
        
        // Verificar colisiones
        if (checkCollisions()) {
            endGame();
            renderer.render(scene, camera);
            return;
        }
        
        // Añadir nueva cabeza
        snake.unshift(newHead);
        
        // Verificar si comió comida
        if (newHead.x === food.x && newHead.z === food.z) {
            score += 10;
            createFood();
        } else {
            // Remover cola si no comió
            snake.pop();
        }
        
        updateHUD();
        renderSnake();
    }
    
    // Actualizar cámara para seguir a la serpiente
    const head = snake[0];
    const cameraOffsetX = Math.sin(Date.now() * 0.0005) * 5;
    camera.position.x = head.x + cameraOffsetX;
    camera.position.y = 20;
    camera.position.z = head.z + 30;
    camera.lookAt(head.x, 0, head.z);
    
    renderer.render(scene, camera);
}

// Manejar redimensionamiento de ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
