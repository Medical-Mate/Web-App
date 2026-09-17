/** 3D 인체도 좌표 · 카메라 규격
 *
 * 원본: intake/ui/BodyMap3dGeometry.kt (anchors3d.json · humanmap-3d-anchors/2.0)
 *       + BodyMap3dCamera.kt 의 상수
 *
 * 좌표계는 Y 업 · 신장 1.0 · 원점이 발바닥과 정수리의 가운데(y는 -0.5~+0.5) · 앞면이 +Z.
 * 거리가 신장 기준이라 PICK_MAX_DISTANCE 와 그대로 견줄 수 있다.
 * 손으로 고치지 말 것.
 */
import type { BodySide } from './bodyMap'

export interface Body3dPoint {
  zoneId: string
  anchorId: string
  side: BodySide
  x: number
  y: number
  z: number
  /** 표면 법선. 카메라를 등진 점을 걸러내는 데 쓴다. */
  nx: number
  ny: number
  nz: number
}

export interface Body3dFrame {
  anchorId: string
  back: boolean
  /** 좌우 중 한쪽만 담는 앵커(팔·다리). 왼쪽이면 target.x 부호를 뒤집는다. */
  oneSide: boolean
  zoneCount: number
  target: { x: number; y: number; z: number }
  /** 그 앵커의 구역들이 차지하는 크기. 카메라 거리를 여기서 계산한다. */
  span: number
}

/** 짚은 지점에서 이 거리를 넘으면 구역을 채택하지 않는다. 신장의 10%. */
export const PICK_MAX_DISTANCE = 0.1

/* BodyMap3dCamera.kt 의 상수 그대로 */
export const FOV_DEGREES = 28
export const HOME_DISTANCE = 2.3
export const HOME_TARGET = { x: 0, y: 0.02, z: 0 }
export const MIN_DISTANCE = 0.45
export const MAX_DISTANCE = 2.6
export const PITCH_LIMIT = 1.2
/** 법선이 카메라를 이만큼도 안 향하면 뒤쪽 점으로 보고 감춘다. */
export const FACING_LIMIT = -0.12
/** 확대해 들어갈 때의 활강 시간(ms). */
export const GLIDE_MS = 460
/**
 * 짚는 점(스프라이트)의 크기. `sizeAttenuation` 을 끈 값이라 화면 세로에 대한 비율이고,
 * 멀어져도 같은 크기다. 360 폭 프레임에서 대략 지름 12px · 고른 점 17px. 처음 0.034/0.046
 * (≈22px)은 인체도에 비해 커서 반 가까이 줄였다.
 */
export const DOT_IDLE = 0.019
export const DOT_ON = 0.026

export const BODY3D_ZONES: Body3dPoint[] = [
  {
    "zoneId": "SUR:001",
    "anchorId": "ANC:001",
    "side": "CENTER",
    "x": 0,
    "y": 0.465,
    "z": 0.05684,
    "nx": -0.0013,
    "ny": 0.3893,
    "nz": 0.9211
  },
  {
    "zoneId": "SUR:002",
    "anchorId": "ANC:001",
    "side": "RIGHT",
    "x": -0.0178,
    "y": 0.4374,
    "z": 0.05194,
    "nx": -0.1343,
    "ny": -0.2865,
    "nz": 0.9486
  },
  {
    "zoneId": "SUR:002",
    "anchorId": "ANC:001",
    "side": "LEFT",
    "x": 0.0178,
    "y": 0.4374,
    "z": 0.05184,
    "nx": 0.2137,
    "ny": -0.4006,
    "nz": 0.891
  },
  {
    "zoneId": "SUR:003",
    "anchorId": "ANC:001",
    "side": "RIGHT",
    "x": -0.047,
    "y": 0.4291,
    "z": -0.01037,
    "nx": -0.6632,
    "ny": -0.3895,
    "nz": 0.6392
  },
  {
    "zoneId": "SUR:003",
    "anchorId": "ANC:001",
    "side": "LEFT",
    "x": 0.047,
    "y": 0.4291,
    "z": -0.01112,
    "nx": 0.8437,
    "ny": -0.0734,
    "nz": 0.5317
  },
  {
    "zoneId": "SUR:004",
    "anchorId": "ANC:001",
    "side": "CENTER",
    "x": 0,
    "y": 0.4136,
    "z": 0.07106,
    "nx": 0.0064,
    "ny": 0.4446,
    "nz": 0.8957
  },
  {
    "zoneId": "SUR:005",
    "anchorId": "ANC:001",
    "side": "CENTER",
    "x": 0,
    "y": 0.3907,
    "z": 0.06047,
    "nx": -0.072,
    "ny": -0.1389,
    "nz": 0.9877
  },
  {
    "zoneId": "SUR:011",
    "anchorId": "ANC:002",
    "side": "CENTER",
    "x": 0,
    "y": 0.342,
    "z": 0.02388,
    "nx": -0.0056,
    "ny": -0.1985,
    "nz": 0.9801
  },
  {
    "zoneId": "SUR:012",
    "anchorId": "ANC:002",
    "side": "RIGHT",
    "x": -0.026,
    "y": 0.373,
    "z": 0.01604,
    "nx": -0.6975,
    "ny": -0.6097,
    "nz": 0.3765
  },
  {
    "zoneId": "SUR:012",
    "anchorId": "ANC:002",
    "side": "LEFT",
    "x": 0.026,
    "y": 0.373,
    "z": 0.01611,
    "nx": 0.7207,
    "ny": -0.5962,
    "nz": 0.3537
  },
  {
    "zoneId": "SUR:021",
    "anchorId": "ANC:003",
    "side": "CENTER",
    "x": 0,
    "y": 0.275,
    "z": 0.04534,
    "nx": -0.0048,
    "ny": 0.4303,
    "nz": 0.9027
  },
  {
    "zoneId": "SUR:022",
    "anchorId": "ANC:003",
    "side": "RIGHT",
    "x": -0.072,
    "y": 0.2,
    "z": 0.04538,
    "nx": -0.714,
    "ny": -0.0036,
    "nz": 0.7001
  },
  {
    "zoneId": "SUR:022",
    "anchorId": "ANC:003",
    "side": "LEFT",
    "x": 0.072,
    "y": 0.2,
    "z": 0.04529,
    "nx": 0.7163,
    "ny": 0.0167,
    "nz": 0.6976
  },
  {
    "zoneId": "SUR:031",
    "anchorId": "ANC:004",
    "side": "RIGHT",
    "x": -0.048,
    "y": 0.16,
    "z": 0.06307,
    "nx": -0.5111,
    "ny": -0.0341,
    "nz": 0.8588
  },
  {
    "zoneId": "SUR:031",
    "anchorId": "ANC:004",
    "side": "LEFT",
    "x": 0.048,
    "y": 0.16,
    "z": 0.06258,
    "nx": 0.512,
    "ny": -0.0276,
    "nz": 0.8585
  },
  {
    "zoneId": "SUR:032",
    "anchorId": "ANC:004",
    "side": "RIGHT",
    "x": -0.043,
    "y": 0.06,
    "z": 0.06081,
    "nx": -0.3713,
    "ny": -0.1768,
    "nz": 0.9115
  },
  {
    "zoneId": "SUR:032",
    "anchorId": "ANC:004",
    "side": "LEFT",
    "x": 0.043,
    "y": 0.06,
    "z": 0.0608,
    "nx": 0.3681,
    "ny": -0.171,
    "nz": 0.9139
  },
  {
    "zoneId": "SUR:051",
    "anchorId": "ANC:013",
    "side": "RIGHT",
    "x": -0.128,
    "y": 0.3,
    "z": -0.00509,
    "nx": -0.6939,
    "ny": 0.4075,
    "nz": 0.5937
  },
  {
    "zoneId": "SUR:051",
    "anchorId": "ANC:013",
    "side": "LEFT",
    "x": 0.128,
    "y": 0.3,
    "z": -0.00603,
    "nx": 0.6835,
    "ny": 0.4205,
    "nz": 0.5966
  },
  {
    "zoneId": "SUR:055",
    "anchorId": "ANC:013",
    "side": "RIGHT",
    "x": -0.142,
    "y": 0.21,
    "z": -0.01364,
    "nx": -0.7734,
    "ny": 0.3089,
    "nz": 0.5535
  },
  {
    "zoneId": "SUR:055",
    "anchorId": "ANC:013",
    "side": "LEFT",
    "x": 0.142,
    "y": 0.21,
    "z": -0.01299,
    "nx": 0.7475,
    "ny": 0.3464,
    "nz": 0.5668
  },
  {
    "zoneId": "SUR:061",
    "anchorId": "ANC:013",
    "side": "RIGHT",
    "x": -0.154,
    "y": 0.12,
    "z": 0.00479,
    "nx": 0.6099,
    "ny": 0.1497,
    "nz": 0.7782
  },
  {
    "zoneId": "SUR:061",
    "anchorId": "ANC:013",
    "side": "LEFT",
    "x": 0.154,
    "y": 0.12,
    "z": 0.00537,
    "nx": -0.5757,
    "ny": 0.0731,
    "nz": 0.8144
  },
  {
    "zoneId": "SUR:065",
    "anchorId": "ANC:013",
    "side": "RIGHT",
    "x": -0.164,
    "y": 0.06,
    "z": 0.01327,
    "nx": 0.6519,
    "ny": 0.0207,
    "nz": 0.758
  },
  {
    "zoneId": "SUR:065",
    "anchorId": "ANC:013",
    "side": "LEFT",
    "x": 0.164,
    "y": 0.06,
    "z": 0.01335,
    "nx": -0.6093,
    "ny": 0.0496,
    "nz": 0.7914
  },
  {
    "zoneId": "SUR:071",
    "anchorId": "ANC:013",
    "side": "RIGHT",
    "x": -0.175,
    "y": 0.005,
    "z": 0.04029,
    "nx": 0.0663,
    "ny": 0.5662,
    "nz": 0.8216
  },
  {
    "zoneId": "SUR:071",
    "anchorId": "ANC:013",
    "side": "LEFT",
    "x": 0.175,
    "y": 0.005,
    "z": 0.03995,
    "nx": -0.1003,
    "ny": 0.5504,
    "nz": 0.8289
  },
  {
    "zoneId": "SUR:072",
    "anchorId": "ANC:013",
    "side": "RIGHT",
    "x": -0.17,
    "y": -0.07,
    "z": 0.05927,
    "nx": -0.1258,
    "ny": 0.0792,
    "nz": 0.9889
  },
  {
    "zoneId": "SUR:072",
    "anchorId": "ANC:013",
    "side": "LEFT",
    "x": 0.17,
    "y": -0.07,
    "z": 0.05899,
    "nx": 0.109,
    "ny": 0.0999,
    "nz": 0.989
  },
  {
    "zoneId": "SUR:090",
    "anchorId": "ANC:014",
    "side": "RIGHT",
    "x": -0.057,
    "y": -0.15,
    "z": 0.04102,
    "nx": -0.2543,
    "ny": -0.2854,
    "nz": 0.924
  },
  {
    "zoneId": "SUR:090",
    "anchorId": "ANC:014",
    "side": "LEFT",
    "x": 0.057,
    "y": -0.15,
    "z": 0.04104,
    "nx": 0.2704,
    "ny": -0.2746,
    "nz": 0.9228
  },
  {
    "zoneId": "SUR:091",
    "anchorId": "ANC:014",
    "side": "RIGHT",
    "x": -0.0585,
    "y": -0.22,
    "z": 0.02481,
    "nx": 0.0853,
    "ny": -0.4124,
    "nz": 0.907
  },
  {
    "zoneId": "SUR:091",
    "anchorId": "ANC:014",
    "side": "LEFT",
    "x": 0.0585,
    "y": -0.22,
    "z": 0.02506,
    "nx": -0.0214,
    "ny": -0.4125,
    "nz": 0.9107
  },
  {
    "zoneId": "SUR:097",
    "anchorId": "ANC:014",
    "side": "RIGHT",
    "x": -0.072,
    "y": -0.31,
    "z": 0.00562,
    "nx": 0.2405,
    "ny": -0.1219,
    "nz": 0.963
  },
  {
    "zoneId": "SUR:097",
    "anchorId": "ANC:014",
    "side": "LEFT",
    "x": 0.072,
    "y": -0.31,
    "z": 0.0057,
    "nx": -0.18,
    "ny": -0.1273,
    "nz": 0.9754
  },
  {
    "zoneId": "SUR:101",
    "anchorId": "ANC:014",
    "side": "RIGHT",
    "x": -0.069,
    "y": -0.42,
    "z": -0.00187,
    "nx": -0.0457,
    "ny": 0.2882,
    "nz": 0.9565
  },
  {
    "zoneId": "SUR:101",
    "anchorId": "ANC:014",
    "side": "LEFT",
    "x": 0.069,
    "y": -0.42,
    "z": -0.00198,
    "nx": 0.0026,
    "ny": 0.298,
    "nz": 0.9546
  },
  {
    "zoneId": "SUR:102",
    "anchorId": "ANC:014",
    "side": "RIGHT",
    "x": -0.077,
    "y": -0.48,
    "z": 0.07517,
    "nx": -0.0352,
    "ny": 0.8521,
    "nz": 0.5223
  },
  {
    "zoneId": "SUR:102",
    "anchorId": "ANC:014",
    "side": "LEFT",
    "x": 0.077,
    "y": -0.48,
    "z": 0.07332,
    "nx": 0.0076,
    "ny": 0.8744,
    "nz": 0.4852
  },
  {
    "zoneId": "SUR:041",
    "anchorId": "ANC:012",
    "side": "CENTER",
    "x": 0,
    "y": 0.08,
    "z": -0.05174,
    "nx": -0.0081,
    "ny": 0.2604,
    "nz": -0.9655
  },
  {
    "zoneId": "SUR:042",
    "anchorId": "ANC:012",
    "side": "RIGHT",
    "x": -0.062,
    "y": 0.12,
    "z": 0.04966,
    "nx": -0.6389,
    "ny": 0.1399,
    "nz": 0.7565
  },
  {
    "zoneId": "SUR:042",
    "anchorId": "ANC:012",
    "side": "RIGHT",
    "x": -0.062,
    "y": 0.12,
    "z": -0.04237,
    "nx": -0.3804,
    "ny": 0.1677,
    "nz": -0.9095
  },
  {
    "zoneId": "SUR:042",
    "anchorId": "ANC:012",
    "side": "LEFT",
    "x": 0.062,
    "y": 0.12,
    "z": 0.04943,
    "nx": 0.6521,
    "ny": 0.1423,
    "nz": 0.7446
  },
  {
    "zoneId": "SUR:042",
    "anchorId": "ANC:012",
    "side": "LEFT",
    "x": 0.062,
    "y": 0.12,
    "z": -0.04222,
    "nx": 0.3979,
    "ny": 0.1785,
    "nz": -0.8999
  },
  {
    "zoneId": "SUR:081",
    "anchorId": "ANC:012",
    "side": "RIGHT",
    "x": -0.075,
    "y": -0.02,
    "z": -0.06143,
    "nx": -0.5803,
    "ny": -0.3849,
    "nz": -0.7177
  },
  {
    "zoneId": "SUR:081",
    "anchorId": "ANC:012",
    "side": "LEFT",
    "x": 0.075,
    "y": -0.02,
    "z": -0.06091,
    "nx": 0.5867,
    "ny": -0.4097,
    "nz": -0.6985
  }
]

export const BODY3D_ANCHORS: Body3dPoint[] = [
  {
    "zoneId": "ANC:001",
    "anchorId": "ANC:001",
    "side": "CENTER",
    "x": 0,
    "y": 0.455,
    "z": 0.06152,
    "nx": 0.0073,
    "ny": 0.3518,
    "nz": 0.936
  },
  {
    "zoneId": "ANC:002",
    "anchorId": "ANC:002",
    "side": "CENTER",
    "x": 0,
    "y": 0.345,
    "z": 0.02455,
    "nx": 0.0055,
    "ny": -0.2161,
    "nz": 0.9764
  },
  {
    "zoneId": "ANC:003",
    "anchorId": "ANC:003",
    "side": "CENTER",
    "x": 0,
    "y": 0.25,
    "z": 0.05649,
    "nx": -0.0265,
    "ny": 0.2772,
    "nz": 0.9604
  },
  {
    "zoneId": "ANC:004",
    "anchorId": "ANC:004",
    "side": "CENTER",
    "x": 0,
    "y": 0.08,
    "z": 0.06919,
    "nx": 0.0022,
    "ny": -0.0185,
    "nz": 0.9998
  },
  {
    "zoneId": "ANC:013",
    "anchorId": "ANC:013",
    "side": "RIGHT",
    "x": -0.154,
    "y": 0.12,
    "z": 0.00479,
    "nx": 0.6099,
    "ny": 0.1497,
    "nz": 0.7782
  },
  {
    "zoneId": "ANC:013",
    "anchorId": "ANC:013",
    "side": "LEFT",
    "x": 0.154,
    "y": 0.12,
    "z": 0.00537,
    "nx": -0.5757,
    "ny": 0.0731,
    "nz": 0.8144
  },
  {
    "zoneId": "ANC:014",
    "anchorId": "ANC:014",
    "side": "RIGHT",
    "x": -0.065,
    "y": -0.25,
    "z": 0.01083,
    "nx": 0.0184,
    "ny": -0.2494,
    "nz": 0.9682
  },
  {
    "zoneId": "ANC:014",
    "anchorId": "ANC:014",
    "side": "LEFT",
    "x": 0.065,
    "y": -0.25,
    "z": 0.01151,
    "nx": -0.0754,
    "ny": -0.2341,
    "nz": 0.9693
  },
  {
    "zoneId": "ANC:012",
    "anchorId": "ANC:012",
    "side": "CENTER",
    "x": 0,
    "y": 0.07,
    "z": -0.0549,
    "nx": -0.0649,
    "ny": 0.3252,
    "nz": -0.9434
  }
]

export const BODY3D_FRAMES: Body3dFrame[] = [
  {
    "anchorId": "ANC:001",
    "back": false,
    "oneSide": false,
    "zoneCount": 5,
    "target": {
      "x": 0,
      "y": 0.4279,
      "z": 0.0387
    },
    "span": 0.094
  },
  {
    "anchorId": "ANC:002",
    "back": false,
    "oneSide": false,
    "zoneCount": 2,
    "target": {
      "x": 0,
      "y": 0.3575,
      "z": 0.0187
    },
    "span": 0.052
  },
  {
    "anchorId": "ANC:003",
    "back": false,
    "oneSide": false,
    "zoneCount": 2,
    "target": {
      "x": 0,
      "y": 0.2375,
      "z": 0.0453
    },
    "span": 0.144
  },
  {
    "anchorId": "ANC:004",
    "back": false,
    "oneSide": false,
    "zoneCount": 2,
    "target": {
      "x": 0,
      "y": 0.11,
      "z": 0.0618
    },
    "span": 0.1
  },
  {
    "anchorId": "ANC:013",
    "back": false,
    "oneSide": true,
    "zoneCount": 6,
    "target": {
      "x": -0.1515,
      "y": 0.115,
      "z": 0.0165
    },
    "span": 0.37
  },
  {
    "anchorId": "ANC:014",
    "back": false,
    "oneSide": true,
    "zoneCount": 5,
    "target": {
      "x": -0.067,
      "y": -0.315,
      "z": 0.0289
    },
    "span": 0.33
  },
  {
    "anchorId": "ANC:012",
    "back": true,
    "oneSide": false,
    "zoneCount": 3,
    "target": {
      "x": 0,
      "y": 0.05,
      "z": -0.0517
    },
    "span": 0.15
  }
]

/**
 * 그 앵커를 확대할 프레임.
 * 한 앵커에 면마다 프레임이 있을 수 있어 구역이 많은 쪽을 고르고, 같으면 앞면을 쓴다.
 */
export function frameOf(anchorId: string): Body3dFrame | undefined {
  return BODY3D_FRAMES.filter((f) => f.anchorId === anchorId).sort(
    (a, b) => b.zoneCount - a.zoneCount || Number(a.back) - Number(b.back),
  )[0]
}
