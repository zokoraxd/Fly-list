import * as THREE from 'three';
import { feature, mesh } from 'topojson-client';
import countriesAtlas from 'world-atlas/countries-110m.json';
import { greatCircle, latLonToVector3 } from './geo.js';

const LAND_GEO = feature(countriesAtlas, countriesAtlas.objects.land);
const BORDERS_GEO = mesh(countriesAtlas, countriesAtlas.objects.countries);

const PALETTE = {
  dark: {
    ocean: '#091a36',
    landFill: '#173a6e',
    landStroke: '#38bdf8',
    borderColor: '#67e8f9',
    borderOpacity: 0.92,
    gridColor: '#38bdf8',
    gridOpacity: 0.15,
    haloColor: '#38bdf8',
    ringColor: '#67e8f9',
    pinDefault: '#38bdf8',
    pinActive: '#fbbf24',
    pinPicked: '#f472b6',
    routeColor: '#f472b6',
  },
  light: {
    ocean: '#d5e4f5',
    landFill: '#f8fbff',
    landStroke: '#6093cc',
    borderColor: '#1d5fa6',
    borderOpacity: 0.72,
    gridColor: '#1d5fa6',
    gridOpacity: 0.12,
    haloColor: '#3b82f6',
    ringColor: '#1d5fa6',
    pinDefault: '#1d5fa6',
    pinActive: '#d97706',
    pinPicked: '#a8286f',
    routeColor: '#a8286f',
  },
};

export function getGlobePalette(theme) {
  return theme === 'light' ? PALETTE.light : PALETTE.dark;
}

/** Paint a crisp 1024x512 equirectangular land/ocean CanvasTexture from world-atlas. */
export function buildEarthTexture(theme) {
  const palette = getGlobePalette(theme);
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = palette.ocean;
  ctx.fillRect(0, 0, width, height);

  const projectRing = (ring) => {
    ctx.beginPath();
    ring.forEach(([lon, lat], idx) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };

  ctx.fillStyle = palette.landFill;
  ctx.strokeStyle = palette.landStroke;
  ctx.lineWidth = 1;

  for (const geom of LAND_GEO.features) {
    const { type, coordinates } = geom.geometry;
    if (type === 'Polygon') {
      for (const ring of coordinates) {
        projectRing(ring);
        ctx.fill();
        ctx.stroke();
      }
    } else if (type === 'MultiPolygon') {
      for (const poly of coordinates) {
        for (const ring of poly) {
          projectRing(ring);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Build merged neon country borders + coastlines in a single LineSegments draw call. */
export function buildBorderLines(radius = 1.003, theme = 'dark') {
  const palette = getGlobePalette(theme);
  const positions = [];

  for (const line of BORDERS_GEO.coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i];
      const [lon2, lat2] = line[i + 1];
      const [x1, y1, z1] = latLonToVector3(lat1, lon1, radius);
      const [x2, y2, z2] = latLonToVector3(lat2, lon2, radius);
      positions.push(x1, y1, z1, x2, y2, z2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: palette.borderColor,
    transparent: true,
    opacity: palette.borderOpacity,
  });
  return new THREE.LineSegments(geometry, material);
}

/** Build subtle 15-degree latitude/longitude grid lines around the globe. */
export function buildGraticule(radius = 1.0015, theme = 'dark') {
  const palette = getGlobePalette(theme);
  const positions = [];

  for (let lat = -75; lat <= 75; lat += 15) {
    for (let lon = -180; lon < 180; lon += 5) {
      const [x1, y1, z1] = latLonToVector3(lat, lon, radius);
      const [x2, y2, z2] = latLonToVector3(lat, lon + 5, radius);
      positions.push(x1, y1, z1, x2, y2, z2);
    }
  }

  for (let lon = -180; lon < 180; lon += 15) {
    for (let lat = -85; lat < 85; lat += 5) {
      const [x1, y1, z1] = latLonToVector3(lat, lon, radius);
      const [x2, y2, z2] = latLonToVector3(lat + 5, lon, radius);
      positions.push(x1, y1, z1, x2, y2, z2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: palette.gridColor,
    transparent: true,
    opacity: palette.gridOpacity,
  });
  return new THREE.LineSegments(geometry, material);
}

/** Fresnel outer atmosphere glow sphere. */
export function buildAtmosphere(radius = 1.14, theme = 'dark') {
  const palette = getGlobePalette(theme);
  const geometry = new THREE.SphereGeometry(radius, 48, 48);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(palette.haloColor) },
      uIntensity: { value: theme === 'light' ? 0.55 : 0.95 },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormal;
      void main() {
        float rim = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        gl_FragColor = vec4(uColor, clamp(rim, 0.0, 1.0) * uIntensity);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}

/** Deterministic crisp white/cyan starfield points surrounding the Earth. */
export function buildStarfield(count = 750, theme = 'dark') {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const white = new THREE.Color('#ffffff');
  const ice = new THREE.Color('#bae6fd');

  // Simple deterministic LCG so star layout stays stable across renders.
  let seed = 42197;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    const u = rand();
    const v = rand();
    const theta = u * 2 * Math.PI;
    const phi = Math.acos(2 * v - 1);
    const r = 4.2 + rand() * 5.2;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const c = rand() > 0.28 ? white : ice;
    const brightness = 0.6 + rand() * 0.4;
    colors[i * 3] = c.r * brightness;
    colors[i * 3 + 1] = c.g * brightness;
    colors[i * 3 + 2] = c.b * brightness;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: theme === 'light' ? 0.18 : 0.9,
    sizeAttenuation: true,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

/** Build a glowing, pulsing 3D marker oriented outward along the surface normal. */
export function buildPinMarker({ lat, lon, color, radius = 1.006, phase = 0 }) {
  const group = new THREE.Group();
  const [x, y, z] = latLonToVector3(lat, lon, radius);
  group.position.set(x, y, z);

  const normal = new THREE.Vector3(x, y, z).normalize();
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  const coreMat = new THREE.MeshBasicMaterial({ color });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.021, 16, 16), coreMat);
  core.position.y = 0.018;

  const haloMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.037, 16, 16), haloMat);
  halo.position.y = 0.018;

  const stemGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.022, 8);
  const stemMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.006;

  const ringGeo = new THREE.RingGeometry(0.025, 0.039, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const pulseRing = new THREE.Mesh(ringGeo, ringMat);
  pulseRing.position.y = 0.004;

  // Transparent invisible sphere for forgiving hover/click raycasting.
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hitMesh = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), hitMat);
  hitMesh.position.y = 0.018;

  group.add(stem, core, halo, pulseRing, hitMesh);

  return { group, hitMesh, coreMat, haloMat, stemMat, ringMat, pulseRing, phase };
}

/** Build elevated glowing great-circle flight arcs between consecutive destinations. */
export function buildFlightArcs(destinations, color, radius = 1.006) {
  const group = new THREE.Group();
  const valid = destinations.filter((d) => Number.isFinite(d?.latitude) && Number.isFinite(d?.longitude));

  for (let i = 0; i < valid.length - 1; i++) {
    const a = valid[i];
    const b = valid[i + 1];
    const path = greatCircle([a.latitude, a.longitude], [b.latitude, b.longitude], 40);
    if (path.length < 2) continue;

    const points = path.map(([lng, lat], idx) => {
      const t = idx / (path.length - 1);
      const lift = Math.sin(Math.PI * t) * 0.085;
      const [x, y, z] = latLonToVector3(lat, lng, radius + lift);
      return new THREE.Vector3(x, y, z);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72,
    });
    group.add(new THREE.Line(geometry, material));
  }

  return group;
}

/** Dispose geometries and materials recursively when cleaning up a group or mesh. */
export function disposeObject3D(root) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}
