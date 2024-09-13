import * as THREE from 'three';
// Import OrbitControls from Three.js
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Constants for simulation
const G = 1; // Gravitational constant (can be normalized for simplicity)
const dt = 0.01; // Time step for simulation
const minDistance = 0.1; // Minimum distance to avoid large forces
const maxTrailLength = 100; // Max number of points in the tail

// Bodies in the system
class Body {
  constructor(position, velocity, mass, color) {
    this.position = position; // THREE.Vector3
    this.velocity = velocity; // THREE.Vector3
    this.mass = mass;
    this.color = color;

    this.trail = new THREE.BufferGeometry();
    this.trailPositions = [];
    this.trailMaterial = new THREE.LineBasicMaterial({ color: this.color });
    this.trailLine = new THREE.Line(this.trail, this.trailMaterial);
  }

  applyForce(force) {
    // F = ma -> a = F / m
    const acceleration = force.clone().divideScalar(this.mass);
    this.velocity.add(acceleration.multiplyScalar(dt));
  }

  updatePosition() {
    this.position.add(this.velocity.clone().multiplyScalar(dt));
  }

  updateTrail() {
    // Add the current position to the trail
    this.trailPositions.push(this.position.clone());

    // Limit the trail length
    if (this.trailPositions.length > maxTrailLength) {
      this.trailPositions.shift(); // Remove the oldest position if it exceeds the max length
    }

    // Convert trailPositions to a flat array for THREE.js
    const positionsArray = new Float32Array(this.trailPositions.length * 3);
    this.trailPositions.forEach((pos, i) => {
      positionsArray[i * 3] = pos.x;
      positionsArray[i * 3 + 1] = pos.y;
      positionsArray[i * 3 + 2] = pos.z;
    });

    // Update the trail geometry
    this.trail.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
    this.trail.setDrawRange(0, this.trailPositions.length); // Only draw the number of points we have
  }
}

// Function to compute the orbital velocity magnitude for a circular orbit
function getOrbitalVelocity(body1, body2) {
  const distance = body1.position.distanceTo(body2.position);
  return Math.sqrt((G * body2.mass) / distance);
}

// Create three bodies for the system
const bodyA = new Body(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 0, 0), 1, 0xff0000);
const bodyB = new Body(new THREE.Vector3(1, 0, 1), new THREE.Vector3(0, 0, 0), 1, 0x00ff00);
const bodyC = new Body(new THREE.Vector3(-1, 0, 1), new THREE.Vector3(0, 0, 0), 1, 0x0000ff);

// Set initial velocities for circular orbits
const distanceAB = bodyA.position.distanceTo(bodyB.position);
const orbitalVelocityA = getOrbitalVelocity(bodyA, bodyB);
const directionAB = bodyA.position.clone().sub(bodyB.position).normalize();
bodyA.velocity = new THREE.Vector3(-directionAB.y, directionAB.x, 0).multiplyScalar(orbitalVelocityA);

const distanceBC = bodyC.position.distanceTo(bodyB.position);
const orbitalVelocityC = getOrbitalVelocity(bodyC, bodyB);
const directionBC = bodyC.position.clone().sub(bodyB.position).normalize();
bodyC.velocity = new THREE.Vector3(-directionBC.y, directionBC.x, 0).multiplyScalar(orbitalVelocityC);

// Function to compute the gravitational force between two bodies
function computeGravitationalForce(body1, body2) {
  const distanceVec = body2.position.clone().sub(body1.position);
  let distance = distanceVec.length();

  // Avoid extremely small distances to prevent explosion in force magnitude
  if (distance < minDistance) distance = minDistance;

  const forceMagnitude = (G * body1.mass * body2.mass) / (distance * distance);

  // Return the vector in the direction of body2 to body1, with magnitude equal to force
  return distanceVec.normalize().multiplyScalar(forceMagnitude);
}

// Update forces and positions of the three bodies
function updateBodies() {
  // Calculate forces between bodies
  const forceAB = computeGravitationalForce(bodyA, bodyB);
  const forceAC = computeGravitationalForce(bodyA, bodyC);
  const forceBC = computeGravitationalForce(bodyB, bodyC);

  // Apply forces on bodyA (forceAB + forceAC)
  bodyA.applyForce(forceAB.clone().add(forceAC.clone()));

  // Apply forces on bodyB (forceAB + forceBC, negated for the forces acting on bodyB)
  bodyB.applyForce(forceAB.clone().negate().add(forceBC.clone()));

  // Apply forces on bodyC (forceAC + forceBC, both negated for bodyC)
  bodyC.applyForce(forceAC.clone().negate().add(forceBC.clone().negate()));

  // Update the positions of each body
  bodyA.updatePosition();
  bodyB.updatePosition();
  bodyC.updatePosition();

  // Update the trails of each body
  bodyA.updateTrail();
  bodyB.updateTrail();
  bodyC.updateTrail();
}

// Set up basic Three.js scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Set camera position
camera.position.z = 2;
camera.position.x = 2;
camera.position.y = 2;



// Orbit Controls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;  // smooth motion
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;  // pan only horizontally and vertically
controls.maxDistance = 20;  // Limit zoom out
controls.minDistance = 2;   // Limit zoom in

// Lighting (optional)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
scene.add(ambientLight);

// 3D Visual Representation
const geometry = new THREE.SphereGeometry(0.1, 32, 32);
const materialA = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const materialB = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const materialC = new THREE.MeshBasicMaterial({ color: 0x0000ff });

const sphereA = new THREE.Mesh(geometry, materialA);
const sphereB = new THREE.Mesh(geometry, materialB);
const sphereC = new THREE.Mesh(geometry, materialC);

scene.add(sphereA);
scene.add(sphereB);
scene.add(sphereC);

// Add the trail lines to the scene
scene.add(bodyA.trailLine);
scene.add(bodyB.trailLine);
scene.add(bodyC.trailLine);

// Add a grid helper
const grid = new THREE.GridHelper(10, 10);
//scene.add(grid);

// Animation Loop for updating bodies and rendering the scene
function animateThreeBodyProblem() {
  requestAnimationFrame(animateThreeBodyProblem);

  // Update the positions and trails of the bodies
  updateBodies();

  // Sync the Three.js meshes with the new positions
  sphereA.position.copy(bodyA.position);
  sphereB.position.copy(bodyB.position);
  sphereC.position.copy(bodyC.position);

  // Update the controls to respond to user input
  controls.update();

  // Render the scene with the updated positions and trails
  renderer.render(scene, camera);
}

animateThreeBodyProblem();

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});