import Foundation
import CoreGraphics
import ImageIO

// Traces the beat map's routes along its streets. Run by trace_routes.py,
// which writes src/beat-routes.js — see there.
// usage: trace_routes <map> "x,y;x,y;..." ...   (each arg: stops in world units)
// prints one line per leg, a simplified world polyline "x,y;x,y;...", then "--"
let a = CommandLine.arguments
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil)!
let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let IW = img.width, IH = img.height
let bctx = CGContext(data: nil, width: IW, height: IH, bitsPerComponent: 8, bytesPerRow: IW * 4,
                     space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
bctx.draw(img, in: CGRect(x: 0, y: 0, width: IW, height: IH))
let px = bctx.data!.assumingMemoryBound(to: UInt8.self)

let F = 2                       // source px per cell
let IMG_PX = 0.375
// world region searched
let WX0 = 60.0, WY0 = 80.0, WX1 = 800.0, WY1 = 740.0
let SX0 = Int(WX0 / IMG_PX + 1450), SY0 = Int(WY0 / IMG_PX + 290)
let GW = Int((WX1 - WX0) / IMG_PX) / F, GH = Int((WY1 - WY0) / IMG_PX) / F

func isRoad(_ sx: Int, _ sy: Int) -> Bool {
  let i = (sy * IW + sx) * 4
  let r = Int(px[i]), g = Int(px[i + 1]), b = Int(px[i + 2])
  // road blue-grey ≈ (202, 215, 228)
  return abs(r - 202) <= 12 && abs(g - 215) <= 10 && abs(b - 228) <= 10
}
var road = [Bool](repeating: false, count: GW * GH)
for y in 0..<GH { for x in 0..<GW {
  var n = 0
  for dy in 0..<F { for dx in 0..<F { if isRoad(SX0 + x * F + dx, SY0 + y * F + dy) { n += 1 } } }
  road[y * GW + x] = n * 2 >= F * F
} }
// close gaps left by labels and arrows: dilate R then erode R
func morph(_ m: [Bool], _ R: Int, dilate: Bool) -> [Bool] {
  var out = m
  for y in 0..<GH { for x in 0..<GW {
    var v = !dilate
    outer: for dy in -R...R { for dx in -R...R {
      if dx * dx + dy * dy > R * R { continue }
      let xx = x + dx, yy = y + dy
      if xx < 0 || yy < 0 || xx >= GW || yy >= GH { continue }
      if dilate ? m[yy * GW + xx] : !m[yy * GW + xx] { v = dilate; break outer }
    } }
    out[y * GW + x] = v
  } }
  return out
}
let R = 4
road = morph(morph(road, R, dilate: true), R, dilate: false)

// distance to the nearest non-road cell, to keep paths on the road's centre
var dist = [Int](repeating: Int.max, count: GW * GH)
var q = [Int]()
for i in 0..<(GW * GH) where !road[i] { dist[i] = 0; q.append(i) }
var h = 0
while h < q.count {
  let i = q[h]; h += 1
  let x = i % GW, y = i / GW
  for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
    let xx = x + dx, yy = y + dy
    if xx < 0 || yy < 0 || xx >= GW || yy >= GH { continue }
    let j = yy * GW + xx
    if dist[j] > dist[i] + 1 { dist[j] = dist[i] + 1; q.append(j) }
  }
}

func cell(_ wx: Double, _ wy: Double) -> (Int, Int) {
  (Int((wx / IMG_PX + 1450 - Double(SX0)) / Double(F)), Int((wy / IMG_PX + 290 - Double(SY0)) / Double(F)))
}
func world(_ x: Int, _ y: Int) -> (Double, Double) {
  (((Double(SX0) + (Double(x) + 0.5) * Double(F)) - 1450) * IMG_PX,
   ((Double(SY0) + (Double(y) + 0.5) * Double(F)) - 290) * IMG_PX)
}
func snap(_ c: (Int, Int)) -> Int {
  var best = -1, bd = Int.max
  for y in max(0, c.1 - 15)...min(GH - 1, c.1 + 15) { for x in max(0, c.0 - 15)...min(GW - 1, c.0 + 15) {
    let i = y * GW + x
    if road[i] && dist[i] >= 2 { let d = (x - c.0) * (x - c.0) + (y - c.1) * (y - c.1); if d < bd { bd = d; best = i } }
  } }
  return best
}

// Dijkstra with a binary heap
struct Heap { var a: [(Double, Int)] = []
  mutating func push(_ e: (Double, Int)) { a.append(e); var i = a.count - 1
    while i > 0 { let p = (i - 1) / 2; if a[p].0 <= a[i].0 { break }; a.swapAt(p, i); i = p } }
  mutating func pop() -> (Double, Int)? { if a.isEmpty { return nil }; let top = a[0]; let last = a.removeLast()
    if !a.isEmpty { a[0] = last; var i = 0
      while true { let l = 2 * i + 1, r = l + 1; var m = i
        if l < a.count && a[l].0 < a[m].0 { m = l }; if r < a.count && a[r].0 < a[m].0 { m = r }
        if m == i { break }; a.swapAt(i, m); i = m } }
    return top } }

func path(_ s: Int, _ t: Int) -> [Int] {
  var g = [Double](repeating: .infinity, count: GW * GH)
  var prev = [Int](repeating: -1, count: GW * GH)
  var hp = Heap(); g[s] = 0; hp.push((0, s))
  let tx = t % GW, ty = t / GW
  while let (f, i) = hp.pop() {
    if i == t { break }
    let x = i % GW, y = i / GW
    _ = f
    for dy in -1...1 { for dx in -1...1 {
      if dx == 0 && dy == 0 { continue }
      let xx = x + dx, yy = y + dy
      if xx < 0 || yy < 0 || xx >= GW || yy >= GH { continue }
      let j = yy * GW + xx
      if !road[j] { continue }
      let step = (dx != 0 && dy != 0) ? 1.4142 : 1.0
      let centre = 3.0 / Double(min(dist[j], 8))       // edges of the road cost more
      let ng = g[i] + step * (1 + centre)
      if ng < g[j] { g[j] = ng; prev[j] = i
        let hh = hypot(Double(xx - tx), Double(yy - ty))
        hp.push((ng + hh, j)) }
    } }
  }
  var out = [Int](); var c = t
  while c != -1 { out.append(c); if c == s { break }; c = prev[c] }
  return out.reversed()
}

func simplify(_ p: [(Double, Double)], _ eps: Double) -> [(Double, Double)] {
  if p.count < 3 { return p }
  let a = p[0], b = p[p.count - 1]
  var md = 0.0, mi = 0
  for i in 1..<(p.count - 1) {
    let num = abs((b.1 - a.1) * p[i].0 - (b.0 - a.0) * p[i].1 + b.0 * a.1 - b.1 * a.0)
    let d = num / max(1e-9, hypot(b.0 - a.0, b.1 - a.1))
    if d > md { md = d; mi = i }
  }
  if md <= eps { return [a, b] }
  let l = simplify(Array(p[0...mi]), eps), r = simplify(Array(p[mi...]), eps)
  return l.dropLast() + r
}

for day in a.dropFirst(2) {
  let stops = day.split(separator: ";").map { $0.split(separator: ",").map { Double($0)! } }
  var legs = [String]()
  for k in 1..<stops.count {
    let A = stops[k - 1], B = stops[k]
    let s = snap(cell(A[0], A[1])), t = snap(cell(B[0], B[1]))
    let p = path(s, t)
    if p.isEmpty || p.first != s { legs.append("FAIL"); continue }
    var pts = p.map { world($0 % GW, $0 / GW) }
    pts = simplify(pts, 3.0)
    // the stops themselves, not their snapped cells, at each end
    pts[0] = (A[0], A[1]); pts[pts.count - 1] = (B[0], B[1])
    legs.append(pts.map { String(format: "%.0f,%.0f", $0.0, $0.1) }.joined(separator: ";"))
  }
  print(legs.joined(separator: "\n"))
  print("--")
}
