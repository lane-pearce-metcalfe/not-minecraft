class PerlinNoise {
  private permutation: number[]
  private p: number[]

  constructor() {
    this.permutation = []
    this.p = []
    this.generatePermutation()
  }

  private generatePermutation(): void {
    // Initialize arrays
    this.permutation = new Array(256)
    this.p = new Array(512)

    // Generate random permutation table
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = Math.floor(Math.random() * 256)
    }

    // Duplicate the permutation table
    for (let i = 0; i < 512; i++) {
      this.p[i] = this.permutation[i & 255]
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  public noise(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255

    x -= Math.floor(x)
    y -= Math.floor(y)

    const u = this.fade(x)
    const v = this.fade(y)

    const A = this.p[X] + Y
    const AA = this.p[A]
    const AB = this.p[A + 1]
    const B = this.p[X + 1] + Y
    const BA = this.p[B]
    const BB = this.p[B + 1]

    return this.lerp(
      v,
      this.lerp(
        u,
        this.grad(this.p[AA], x, y),
        this.grad(this.p[BA], x - 1, y)
      ),
      this.lerp(
        u,
        this.grad(this.p[AB], x, y - 1),
        this.grad(this.p[BB], x - 1, y - 1)
      )
    )
  }

  public octaveNoise(
    x: number,
    y: number,
    octaves: number,
    persistence: number
  ): number {
    let total = 0
    let frequency = 1
    let amplitude = 1
    let maxValue = 0

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= persistence
      frequency *= 2
    }

    return total / maxValue
  }
}

interface NoiseMapOptions {
  width: number
  height: number
  scale: number
  octaves: number
  persistence: number
}

function generateNoiseMap(options: NoiseMapOptions): number[][]
function generateNoiseMap(
  width: number,
  height: number,
  scale: number,
  octaves: number,
  persistence: number
): number[][]
function generateNoiseMap(
  widthOrOptions: number | NoiseMapOptions,
  height?: number,
  scale?: number,
  octaves?: number,
  persistence?: number
): number[][] {
  let width: number, h: number, s: number, o: number, p: number

  if (typeof widthOrOptions === 'object') {
    ;({
      width,
      height: h,
      scale: s,
      octaves: o,
      persistence: p,
    } = widthOrOptions)
  } else {
    width = widthOrOptions
    h = height!
    s = scale!
    o = octaves!
    p = persistence!
  }

  const perlin = new PerlinNoise()
  const map: number[][] = new Array(h)

  for (let y = 0; y < h; y++) {
    map[y] = new Array(width)
    for (let x = 0; x < width; x++) {
      const noiseValue = perlin.octaveNoise(x * s, y * s, o, p)
      map[y][x] = (noiseValue + 1) / 2
    }
  }

  return map
}

export { PerlinNoise, generateNoiseMap, type NoiseMapOptions }
