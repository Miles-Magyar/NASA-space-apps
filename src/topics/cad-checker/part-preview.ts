import type { Object3D } from 'three';
import type { BomPart } from './types';

export interface PartPreviewHandle {
  destroy: () => void;
}

export interface PartPreviewOptions {
  parts: BomPart[];
  /** Raw glTF JSON text when the upload was .gltf with possible meshes. */
  gltfText?: string;
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
      <h3>Part preview${options.fileName ? ` <span class="muted">· ${options.fileName}</span>` : ''}</h3>
      <p class="muted">Visual aid only — flammability still comes from the materials library check.</p>
      <div class="cad-mesh-canvas-wrap"><canvas class="cad-mesh-canvas" aria-label="CAD part preview"></canvas></div>
      <p class="cad-mesh-hint muted"></p>
    </div>
  `;

  const canvas = host.querySelector<HTMLCanvasElement>('.cad-mesh-canvas')!;
  const hint = host.querySelector<HTMLElement>('.cad-mesh-hint')!;
  const wrap = host.querySelector<HTMLElement>('.cad-mesh-canvas-wrap')!;

  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0c0c);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 200);
  camera.position.set(2.2, 1.6, 2.8);

  const light = new THREE.DirectionalLight(0xffffff, 1.1);
  light.position.set(3, 5, 4);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  scene.add(new THREE.GridHelper(6, 12, 0x333333, 0x222222));

  let disposed = false;
  let frame = 0;
  let root: Object3D | null = null;

  const resize = () => {
    const w = Math.max(wrap.clientWidth, 200);
    const h = Math.max(220, Math.min(360, Math.round(w * 0.55)));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const fitCamera = (object: Object3D) => {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.5);
    camera.position.set(center.x + maxDim * 1.4, center.y + maxDim * 0.9, center.z + maxDim * 1.6);
    camera.lookAt(center);
  };

  const animate = () => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    if (root) root.rotation.y += 0.004;
    renderer.render(scene, camera);
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
    hint.textContent =
      'Procedural preview from imported part names/ids (no mesh in file). Export glTF with meshes for true geometry.';
  };

  try {
    if (options.gltfText && looksLikeGltfWithMesh(options.gltfText)) {
      const loader = new GLTFLoader();
      const gltf = await loader.parseAsync(options.gltfText!, '');
      root = gltf.scene;
      scene.add(gltf.scene);
      fitCamera(gltf.scene);
      hint.textContent = 'glTF mesh preview — orbit is automatic; materials drive the flammability table below.';
    } else if (options.parts.length) {
      buildProcedural(options.parts);
    } else {
      hint.textContent = 'No parts or meshes to preview.';
    }
  } catch (err) {
    hint.textContent = `Preview failed: ${err instanceof Error ? err.message : 'unknown error'}. Showing procedural fallback.`;
    if (options.parts.length) buildProcedural(options.parts);
  }

  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(wrap);
  animate();

  return {
    destroy: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro?.disconnect();
      renderer.dispose();
      host.innerHTML = '';
    },
  };
}
