import type { Material, Object3D, Texture, WebGLRenderer } from 'three';
import type { BomPart } from './types';
import { escapeHtml } from './escape';

export interface PartPreviewHandle {
  destroy: () => void;
}

export interface PartPreviewOptions {
  parts: BomPart[];
  /** Raw glTF JSON text when the upload was .gltf with possible meshes. */
  gltfText?: string;
  /** Binary GLB buffer for mesh preview. */
  glbBuffer?: ArrayBuffer;
  fileName?: string;
}

/** Exported for unit tests — true when glTF JSON declares at least one mesh. */
export function looksLikeGltfWithMesh(text: string): boolean {
  try {
    const o = JSON.parse(text) as { meshes?: unknown[] };
    return Array.isArray(o.meshes) && o.meshes.length > 0;
  } catch {
    return false;
  }
}

/**
 * CAD Checker 3D preview: real glTF meshes when present, otherwise a procedural
 * assembly of boxes from BomPart (+ parentId). Does not invent flammability data.
 */
export async function mountPartPreview(
  host: HTMLElement,
  options: PartPreviewOptions,
): Promise<PartPreviewHandle> {
  host.innerHTML = `
    <div class="cad-mesh-preview">
      <h3>Part preview${options.fileName ? ` <span class="muted">· ${escapeHtml(options.fileName)}</span>` : ''}</h3>
      <p class="muted">Visual aid only — flammability still comes from the materials library check.</p>
      <div class="cad-mesh-canvas-wrap" hidden><canvas class="cad-mesh-canvas" aria-label="CAD part preview. Use arrow keys to rotate." tabindex="0"></canvas></div>
      <p class="cad-mesh-hint muted" role="status">Loading 3D preview…</p>
      <div class="cad-mesh-controls" hidden>
        <button type="button" class="btn">Reset view</button>
        <span>Drag to rotate. Scroll or pinch to zoom.</span>
      </div>
    </div>
  `;

  const canvas = host.querySelector<HTMLCanvasElement>('.cad-mesh-canvas')!;
  const hint = host.querySelector<HTMLElement>('.cad-mesh-hint')!;
  const wrap = host.querySelector<HTMLElement>('.cad-mesh-canvas-wrap')!;
  const toolbar = host.querySelector<HTMLElement>('.cad-mesh-controls')!;
  const reset = toolbar.querySelector<HTMLButtonElement>('button')!;
  const destroyMarkup = () => host.replaceChildren();
  const hasMesh = Boolean(options.glbBuffer || (options.gltfText && looksLikeGltfWithMesh(options.gltfText)));
  if (!hasMesh && !options.parts.length) {
    hint.textContent = 'No parts or meshes to preview.';
    return { destroy: destroyMarkup };
  }

  const [THREE, { OrbitControls }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/controls/OrbitControls.js'),
  ]);
  let renderer: WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    hint.textContent = '3D preview is unavailable in this browser. You can still use the imported part list and flammability results.';
    return { destroy: destroyMarkup };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0c0c);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;

  const light = new THREE.DirectionalLight(0xffffff, 1.1);
  light.position.set(3, 5, 4);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const grid = new THREE.GridHelper(6, 12, 0x333333, 0x222222);
  scene.add(grid);

  let root: Object3D | null = null;
  const render = () => renderer.render(scene, camera);

  const resize = () => {
    const w = Math.max(wrap.clientWidth, 1);
    const h = Math.max(220, Math.min(360, Math.round(w * 0.55)));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };

  const fitCamera = (object: Object3D) => {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.5);
    if (box.isEmpty()) throw new Error('No geometry in scene');
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const distance = maxDim * 0.9 / Math.sin(Math.min(vertical, horizontal));
    camera.near = Math.max(maxDim / 1000, 0.0001);
    camera.far = distance + maxDim * 100;
    camera.updateProjectionMatrix();
    camera.position.copy(center).addScaledVector(new THREE.Vector3(1.4, 0.9, 1.6).normalize(), distance);
    controls.target.copy(center);
    controls.minDistance = maxDim * 0.25;
    controls.maxDistance = distance * 5;
    grid.position.set(center.x, box.min.y, center.z);
    grid.scale.setScalar(maxDim / 2);
    controls.update();
    controls.saveState();
  };

  const rotateWithKeys = (event: KeyboardEvent) => {
    const step = Math.PI / 12;
    switch (event.key) {
      case 'ArrowLeft': controls.rotateLeft(step); break;
      case 'ArrowRight': controls.rotateLeft(-step); break;
      case 'ArrowUp': controls.rotateUp(step); break;
      case 'ArrowDown': controls.rotateUp(-step); break;
      default: return;
    }
    event.preventDefault();
  };

  const disposeModel = (model: Object3D) => {
    const materials = new Set<Material>();
    const textures = new Set<Texture>();
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const property of Object.values(material)) {
          if (property instanceof THREE.Texture) textures.add(property);
        }
      }
    });
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
  };

  const buildProcedural = (parts: BomPart[]) => {
    const group = new THREE.Group();
    const byParent = new Map<string | undefined, BomPart[]>();
    for (const p of parts) {
      const key = p.parentId;
      const list = byParent.get(key) ?? [];
      list.push(p);
      byParent.set(key, list);
    }

    const palette = [0x6ec6ff, 0xc0c0c0, 0xd4a373, 0x7dcea0, 0xf5b7b1, 0xf7dc6f];
    let i = 0;
    const roots = byParent.get(undefined) ?? parts.filter((p) => !p.parentId);
    const place = (list: BomPart[], y: number) => {
      const n = Math.max(list.length, 1);
      list.forEach((p, idx) => {
        const geo = new THREE.BoxGeometry(0.55, 0.18, 0.55);
        const mat = new THREE.MeshStandardMaterial({
          color: palette[i++ % palette.length],
          metalness: /alum|steel|metal/i.test(p.material) ? 0.7 : 0.15,
          roughness: /pmma|acrylic|plastic/i.test(p.material) ? 0.25 : 0.55,
          transparent: /pmma|acrylic/i.test(p.material),
          opacity: /pmma|acrylic/i.test(p.material) ? 0.75 : 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        const x = (idx - (n - 1) / 2) * 0.75;
        mesh.position.set(x, y, 0);
        mesh.name = p.material;
        group.add(mesh);
      });
    };

    if (roots.length) place(roots, 0.4);
    const childLists = [...byParent.entries()].filter(([k]) => k != null);
    childLists.forEach(([, list], row) => place(list, -0.15 - row * 0.45));
    if (!group.children.length) place(parts, 0);

    scene.add(group);
    root = group;
    fitCamera(group);
  };

  wrap.hidden = false;
  resize();

  try {
    if (hasMesh) {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        if (/^(data|blob):/i.test(url)) return url;
        throw new Error('External mesh resources are unavailable');
      });
      const gltf = await new GLTFLoader(manager).parseAsync(options.glbBuffer ?? options.gltfText!, '');
      root = gltf.scene;
      scene.add(gltf.scene);
      fitCamera(gltf.scene);
      hint.textContent = 'Uploaded mesh geometry. The flammability check uses the material data in the part list.';
    } else {
      buildProcedural(options.parts);
      hint.textContent = 'Schematic preview from part names and assembly relationships. Box size and position do not represent measured geometry.';
    }
  } catch {
    if (root) {
      scene.remove(root);
      disposeModel(root);
      root = null;
    }
    if (options.parts.length) {
      buildProcedural(options.parts);
      hint.textContent = 'The mesh could not be opened. This schematic shows part relationships. Try a self-contained GLB for imported geometry.';
    } else {
      wrap.hidden = true;
      hint.textContent = 'The mesh could not be opened. Try a self-contained GLB.';
    }
  }

  toolbar.hidden = !root;
  const ro = root && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(wrap);
  controls.addEventListener('change', render);
  canvas.addEventListener('keydown', rotateWithKeys);
  const resetView = () => controls.reset();
  reset.addEventListener('click', resetView);
  if (root) render();

  return {
    destroy: () => {
      ro?.disconnect();
      reset.removeEventListener('click', resetView);
      canvas.removeEventListener('keydown', rotateWithKeys);
      controls.dispose();
      grid.dispose();
      if (root) disposeModel(root);
      renderer.dispose();
      destroyMarkup();
    },
  };
}
