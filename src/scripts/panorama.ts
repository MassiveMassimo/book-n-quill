/** Desktop only: the caller must use panorama/panorama-still.jpg on phones. */
export async function createPanorama(
  canvas: HTMLCanvasElement,
  sourceDirectory = '/minecraft/panorama',
): Promise<
  | {
      move(dx: number, dy: number): void;
      resize(): void;
      snapshot(): string;
      load(sourceDirectory: string): Promise<void>;
    }
  | undefined
> {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
  });
  if (!gl) return undefined;
  const hideOnLoss = () => {
    canvas.hidden = true;
  };
  canvas.addEventListener('webglcontextlost', hideOnLoss);
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let texture: WebGLTexture | null = null;
  let buffer: WebGLBuffer | null = null;
  try {
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Panorama shader allocation failed');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error('Panorama shader compilation failed');
      return shader;
    };
    const vertex = compile(
      gl.VERTEX_SHADER,
      `
      attribute vec2 position;
      varying vec2 screen;
      void main() { screen = position; gl_Position = vec4(position, 0.0, 1.0); }
    `,
    );
    const fragment = compile(
      gl.FRAGMENT_SHADER,
      `
      precision mediump float;
      varying vec2 screen;
      uniform samplerCube panorama;
      uniform vec2 angles;
      uniform vec2 projection;
      void main() {
        vec3 ray = vec3(screen * projection, 1.0);
        float cp = cos(angles.y), sp = sin(angles.y);
        ray.yz = vec2(cp * ray.y + sp * ray.z, -sp * ray.y + cp * ray.z);
        float cy = cos(angles.x), sy = sin(angles.x);
        ray.xz = vec2(cy * ray.x + sy * ray.z, -sy * ray.x + cy * ray.z);
        // Java's initial rotationX(PI): upright sky is face 4, forward is face 0.
        gl_FragColor = textureCube(panorama, vec3(ray.x, -ray.y, ray.z));
      }
    `,
    );
    program = gl.createProgram();
    texture = gl.createTexture();
    buffer = gl.createBuffer();
    if (!program || !texture || !buffer)
      throw new Error('Panorama allocation failed');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('Panorama link failed');
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, 'panorama'), 0);
    const angles = gl.getUniformLocation(program, 'angles');
    const projection = gl.getUniformLocation(program, 'projection');
    shaders.forEach((shader) => gl.deleteShader(shader));
    let yaw = 0,
      pitch = 0;
    const draw = () => {
      canvas.dataset.yaw = String(yaw);
      canvas.dataset.pitch = String(pitch);
      if (gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(angles, (yaw * Math.PI) / 180, (pitch * Math.PI) / 180);
      const tangent = Math.tan((35 * Math.PI) / 180);
      gl.uniform2f(
        projection,
        (tangent * canvas.width) / canvas.height,
        tangent,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      draw();
    };
    const load = async (directory: string) => {
      // CubeMapTexture.SUFFIXES in Java 26.3: +X, -X, +Y, -Y, +Z, -Z.
      const images = await Promise.all(
        [1, 3, 5, 4, 0, 2].map(async (face) => {
          const image = new Image();
          image.src = `${directory}/panorama_${face}.png`;
          await image.decode();
          return image;
        }),
      );
      if (gl.isContextLost()) throw new Error('Panorama context lost');
      const size = images[0]!.naturalWidth;
      if (
        !size ||
        size > gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE) ||
        images.some(
          (image) =>
            image.naturalWidth !== size || image.naturalHeight !== size,
        )
      )
        throw new Error(
          'Panorama faces must have equal supported square dimensions',
        );
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      images.forEach((image, face) =>
        gl.texImage2D(
          gl.TEXTURE_CUBE_MAP_POSITIVE_X + face,
          0,
          gl.RGB,
          gl.RGB,
          gl.UNSIGNED_BYTE,
          image,
        ),
      );
      yaw = 0;
      pitch = 0;
      draw();
      canvas.dataset.source = directory;
    };
    await load(sourceDirectory);
    resize();
    return {
      load,
      // Mouse deltas in CSS pixels; 0.15 degrees per pixel. Yaw wraps, pitch clamps.
      move(dx, dy) {
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
        yaw = ((((yaw + dx * 0.15 + 180) % 360) + 360) % 360) - 180;
        pitch = Math.max(-89, Math.min(89, pitch - dy * 0.15));
        draw();
      },
      resize,
      snapshot() {
        draw();
        return gl.isContextLost() ? '' : canvas.toDataURL('image/png');
      },
    };
  } catch {
    canvas.removeEventListener('webglcontextlost', hideOnLoss);
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteBuffer(buffer);
    gl.deleteTexture(texture);
    gl.deleteProgram(program);
    return undefined;
  }
}
