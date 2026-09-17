// 인체도 좌표·부위 온톨로지
// 원본: intake/ui/BodyMapGeometry.kt (humanmap-coords/3.0) + BodyMapOntology.kt (스냅샷 f848848baea4)
// 좌표는 0..1 정규화. 손으로 고치지 말 것.

import { apiAvailable, apiFetch } from './api'
import frontSrc from '../assets/bodymap/bodymap_front.webp'
import backSrc from '../assets/bodymap/bodymap_back.webp'
import headSrc from '../assets/bodymap/bodymap_head.webp'
import neckSrc from '../assets/bodymap/bodymap_neck.webp'
import chestSrc from '../assets/bodymap/bodymap_chest.webp'
import abdomenSrc from '../assets/bodymap/bodymap_abdomen.webp'
import armSrc from '../assets/bodymap/bodymap_arm.webp'
import legSrc from '../assets/bodymap/bodymap_leg.webp'
import lowerBackHipSrc from '../assets/bodymap/bodymap_lower_back_hip.webp'

/** 이미지 파일은 import 로 받는다. 번들러가 배포 경로에 맞게 URL 을 다시 써 준다. */
const DETAIL_IMAGES: Record<string, string> = {
  '/bodymap/bodymap_head.webp': headSrc,
  '/bodymap/bodymap_neck.webp': neckSrc,
  '/bodymap/bodymap_chest.webp': chestSrc,
  '/bodymap/bodymap_abdomen.webp': abdomenSrc,
  '/bodymap/bodymap_arm.webp': armSrc,
  '/bodymap/bodymap_leg.webp': legSrc,
  '/bodymap/bodymap_lower_back_hip.webp': lowerBackHipSrc,
}

export type BodySide = 'CENTER' | 'LEFT' | 'RIGHT' | 'BASE'
export type BodyView = 'FRONT' | 'BACK'

export interface BodyPoint { side: BodySide; x: number; y: number }
export interface BodyZone { id: string; label: string; aliases: string[]; points: BodyPoint[] }
export interface BodyAnchor {
  id: string
  label: string
  aliases: string[]
  view: BodyView | null
  points: BodyPoint[]
  detailImage: string | null
  detailRatio: number | null
  zones: BodyZone[]
}

export const BODY_FRONT = { src: frontSrc, w: 1080, h: 2480 } as const
export const BODY_BACK = { src: backSrc, w: 1080, h: 2480 } as const

export const BODY_ANCHORS: BodyAnchor[] = [
  {
    "id": "ANC:001",
    "label": "머리",
    "aliases": [
      "두부",
      "머리통",
      "머리 전체"
    ],
    "view": "FRONT",
    "points": [
      {
        "side": "CENTER",
        "x": 0.5,
        "y": 0.045
      }
    ],
    "detailImage": "/bodymap/bodymap_head.webp",
    "detailRatio": 0.6788183532369579,
    "zones": [
      {
        "id": "SUR:001",
        "label": "머리 전체·이마",
        "aliases": [
          "이마",
          "앞머리",
          "뒤통수",
          "정수리",
          "옆머리",
          "관자놀이"
        ],
        "points": [
          {
            "side": "CENTER",
            "x": 0.5,
            "y": 0.2727
          }
        ]
      },
      {
        "id": "SUR:002",
        "label": "눈",
        "aliases": [
          "안구",
          "눈알",
          "눈꺼풀",
          "눈두덩"
        ],
        "points": [
          {
            "side": "RIGHT",
            "x": 0.3411,
            "y": 0.44
          },
          {
            "side": "LEFT",
            "x": 0.6589,
            "y": 0.44
          }
        ]
      },
      {
        "id": "SUR:003",
        "label": "귀",
        "aliases": [
          "귓속",
          "귓바퀴",
          "귀 안",
          "귀 뒤"
        ],
        "points": [
          {
            "side": "RIGHT",
            "x": 0.0804,
            "y": 0.4903
          },
          {
            "side": "LEFT",
            "x": 0.9196,
            "y": 0.4903
          }
        ]
      },
      {
        "id": "SUR:004",
        "label": "코",
        "aliases": [
          "콧속",
          "콧등",
          "비강"
        ],
        "points": [
          {
            "side": "CENTER",
            "x": 0.5,
            "y": 0.5842
          }
        ]
      },
      {
        "id": "SUR:005",
        "label": "입",
        "aliases": [
          "입안",
          "구강",
          "입술",
          "혀",
          "잇몸",
          "치아",
          "이빨"
        ],
        "points": [
          {
            "side": "CENTER",
            "x": 0.5,
            "y": 0.723
          }
        ]
      }
    ]
  },
  {
    "id": "ANC:002",
    "label": "목",
    "aliases": [],
    "view": "FRONT",
    "points": [
      {
        "side": "CENTER",
        "x": 0.5,
        "y": 0.155
      }
    ],
    "detailImage": "/bodymap/bodymap_neck.webp",
    "detailRatio": 1.3636363636363635,
    "zones": [
      {
        "id": "SUR:011",
        "label": "목 안(목구멍)",
        "aliases": [
          "목구멍",
          "인후",
          "편도",
          "목 안쪽",
          "목 속"
        ],
        "points": [
          {
            "side": "CENTER",
            "x": 0.5,
            "y": 0.5273
          }
        ]
      },
      {
        "id": "SUR:012",
        "label": "목 뒤·옆",
        "aliases": [
          "뒷목",
          "목덜미",
          "옆목",
          "목 옆",
          "경추",
          "목뼈"
        ],
        "points": [
          {
            "side": "RIGHT",
            "x": 0.3267,
            "y": 0.2455
          },
          {
            "side": "LEFT",
            "x": 0.6733,
            "y": 0.2455
          }
        ]
      }
    ]
  },
  {
    "id": "ANC:003",
    "label": "가슴",
    "aliases": [
      "흉부",
      "가슴팍",
      "앞가슴"
    ],
    "view": "FRONT",
    "points": [
      {
        "side": "CENTER",
        "x": 0.5,
        "y": 0.25
      }
    ],
    "detailImage": "/bodymap/bodymap_chest.webp",
    "detailRatio": 1.5561959654178674,
    "zones": [
      {
        "id": "SUR:021",
        "label": "가슴 가운데",
        "aliases": [
          "가슴뼈",
          "흉골",
          "가슴 중앙",
          "심장 쪽"
        ],
        "points": [
          {
            "side": "CENTER",
            "x": 0.5,
            "y": 0.3611
          }
        ]
      },
      {
        "id": "SUR:022",
        "label": "가슴 옆(갈비)",
        "aliases": [
          "갈비뼈",
          "늑골",
          "옆가슴",
          "갈비"
        ],
        "points": [
          {
            "side": "RIGHT",
            "x": 0.2429,
            "y": 0.7778
          },
          {
            "side": "LEFT",
            "x": 0.7571,
            "y": 0.7778
          }
        ]
      }
    ]
  },
  {
    "id": "ANC:004",
    "label": "배",
    "aliases": [
      "복부",
      "뱃속",
      "배 전체",
      "배꼽"
    ],
    "view": "FRONT",
    "points": [
      {
        "side": "CENTER",
        "x": 0.5,
        "y": 0.42
      }
    ],
    "detailImage": "/bodymap/bodymap_abdomen.webp",
    "detailRatio": 1,
    "zones": [
      {
        "id": "SUR:031",
        "label": "윗배(명치)",
        "aliases": [
          "명치",
          "상복부",
          "윗배",
          "명치끝",
          "배 위쪽"
        ],
        "points": [
          {
            "side": "RIGHT",
            "x": 0.3286,
            "y": 0.2143
          },
          {
            "side": "LEFT",
            "x": 0.6714,
            "y": 0.2143
          }
        ]
      },
      {
        "id": "SUR:032",
        "label": "아랫배",
        "aliases": [
          "하복부",
          "배 아래쪽",
          "골반",
          "배꼽 아래"
        ],
        "points": [
          {
            "side": "RIGHT",
            "x": 0.3464,
            "y": 0.5714
          },
          {
            "side": "LEFT",
            "x": 0.6536,
            "y": 0.5714
          }
        ]
      }
    ]
  },
  {
    "id": "ANC:013",
    "label": "팔",
    "aliases": [
      "상지",
      "팔 전체"
    ],
    "view": "FRONT",
    "points": [
      {
        "side": "RIGHT",
        "x": 0.1372,
        "y": 0.38
      },
      {
        "side": "LEFT",
        "x": 0.8628,
        "y": 0.38
      }
    ],
    "detailImage": "/bodymap/bodymap_arm.webp",
    "detailRatio": 0.37894736842105264,
    "zones": [
      {
        "id": "SUR:051",
        "label": "어깨",
        "aliases": [
          "어깻죽지",
          "견관절",
          "어깨 앞",
          "어깨 뒤"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.5556,
            "y": 0.0947
          }
        ]
      },
      {
        "id": "SUR:055",
        "label": "위팔",
        "aliases": [
          "윗팔",
          "상완",
          "팔 위쪽"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.4611,
            "y": 0.2842
          }
        ]
      },
      {
        "id": "SUR:061",
        "label": "팔꿈치",
        "aliases": [
          "팔굽",
          "주관절"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.4278,
            "y": 0.4737
          }
        ]
      },
      {
        "id": "SUR:065",
        "label": "아래팔",
        "aliases": [
          "아랫팔",
          "전완",
          "팔 아래쪽"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.3944,
            "y": 0.6
          }
        ]
      },
      {
        "id": "SUR:071",
        "label": "손목",
        "aliases": [
          "손목 관절"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.3333,
            "y": 0.7158
          }
        ]
      },
      {
        "id": "SUR:072",
        "label": "손",
        "aliases": [
          "손가락",
          "손바닥",
          "손등",
          "엄지",
          "검지"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.3611,
            "y": 0.8737
          }
        ]
      }
    ]
  },
  {
    "id": "ANC:014",
    "label": "다리",
    "aliases": [
      "하지",
      "다리 전체"
    ],
    "view": "FRONT",
    "points": [
      {
        "side": "RIGHT",
        "x": 0.3507,
        "y": 0.75
      },
      {
        "side": "LEFT",
        "x": 0.6493,
        "y": 0.75
      }
    ],
    "detailImage": "/bodymap/bodymap_leg.webp",
    "detailRatio": 0.38640429338103754,
    "zones": [
      {
        "id": "SUR:090",
        "label": "허벅지",
        "aliases": [
          "대퇴",
          "넓적다리",
          "허벅다리"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.4882,
            "y": 0.1818
          }
        ]
      },
      {
        "id": "SUR:091",
        "label": "무릎",
        "aliases": [
          "슬관절",
          "무릎 앞",
          "무릎 뒤",
          "오금"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.4794,
            "y": 0.3409
          }
        ]
      },
      {
        "id": "SUR:097",
        "label": "종아리",
        "aliases": [
          "장딴지",
          "정강이",
          "정강이뼈"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.4,
            "y": 0.5454
          }
        ]
      },
      {
        "id": "SUR:101",
        "label": "발목",
        "aliases": [
          "발목 관절",
          "아킬레스"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.4177,
            "y": 0.7955
          }
        ]
      },
      {
        "id": "SUR:102",
        "label": "발",
        "aliases": [
          "발가락",
          "발바닥",
          "발등",
          "발뒤꿈치",
          "뒤꿈치"
        ],
        "points": [
          {
            "side": "BASE",
            "x": 0.3706,
            "y": 0.9318
          }
        ]
      }
    ]
  },
  {
    "id": "ANC:012",
    "label": "허리·엉덩이",
    "aliases": [
      "요추",
      "등허리"
    ],
    "view": "BACK",
    "points": [
      {
        "side": "CENTER",
        "x": 0.5,
        "y": 0.43
      }
    ],
    "detailImage": "/bodymap/bodymap_lower_back_hip.webp",
    "detailRatio": 0.7941176470588235,
    "zones": [
      {
        "id": "SUR:041",
        "label": "허리 가운데",
        "aliases": [
          "허리",
          "허리 중앙",
          "꼬리뼈",
          "척추 아래",
          "등 아래"
        ],
        "points": [
          {
            "side": "CENTER",
            "x": 0.5,
            "y": 0.2647
          }
        ]
      },
      {
        "id": "SUR:042",
        "label": "허리 옆",
        "aliases": [
          "옆구리",
          "옆허리",
          "갈비뼈 아래 옆"
        ],
        "points": [
          {
            "side": "LEFT",
            "x": 0.2704,
            "y": 0.1471
          },
          {
            "side": "RIGHT",
            "x": 0.7296,
            "y": 0.1471
          }
        ]
      },
      {
        "id": "SUR:081",
        "label": "엉덩이",
        "aliases": [
          "둔부",
          "고관절",
          "엉치",
          "꽁무니"
        ],
        "points": [
          {
            "side": "LEFT",
            "x": 0.2222,
            "y": 0.5588
          },
          {
            "side": "RIGHT",
            "x": 0.7778,
            "y": 0.5588
          }
        ]
      }
    ]
  },
  {
    "id": "ANC:010",
    "label": "전신",
    "aliases": [
      "온몸",
      "몸 전체",
      "전체",
      "특정 부위 없음"
    ],
    "view": null,
    "points": [],
    "detailImage": null,
    "detailRatio": null,
    "zones": []
  },
  {
    "id": "ANC:011",
    "label": "피부",
    "aliases": [
      "살",
      "피부 표면",
      "겉"
    ],
    "view": null,
    "points": [],
    "detailImage": null,
    "detailRatio": null,
    "zones": []
  }
]

/* 표에 적힌 경로를 번들 URL 로 갈아끼운다. */
BODY_ANCHORS.forEach((a) => {
  if (a.detailImage) a.detailImage = DETAIL_IMAGES[a.detailImage] ?? a.detailImage
})

/** 사이드가 있는 구역은 라벨 앞에 방향을 붙인다. 앱과 같은 표기. */
export function zoneLabel(zone: { label: string }, side: BodySide): string {
  if (side === 'LEFT') return '왼쪽 ' + zone.label
  if (side === 'RIGHT') return '오른쪽 ' + zone.label
  return zone.label
}

/**
 * 좌우 공용 확대 이미지를 쓰는 앵커인지. 팔·다리 둘이다.
 *
 * 그 앵커의 구역 점은 좌우가 갈리지 않고 기준점(`BASE`) 하나뿐이다. 어느 쪽인지는
 * 앵커를 어느 쪽으로 열었는지가 정한다.
 */
export function isMirrored(anchor: BodyAnchor): boolean {
  return anchor.zones.some((z) => z.points.some((p) => p.side === 'BASE'))
}

export interface ZoneChoice {
  zone: BodyZone
  side: BodySide
}

/**
 * 확대한 앵커에서 고를 수 있는 부위들.
 *
 * 인체도의 점과 목록의 줄이 같은 값을 써야 한다. 두 길이 각자 목록을 만들면 한쪽에만
 * 있는 부위가 생기고, 고른 표시도 서로 어긋난다.
 */
export function zoneChoices(anchor: BodyAnchor, anchorSide: BodySide): ZoneChoice[] {
  return anchor.zones.flatMap((zone) =>
    zone.points.map((p) => ({ zone, side: p.side === 'BASE' ? anchorSide : p.side })),
  )
}

/**
 * 검색에서 구역 하나를 고를 수 있는 갈래.
 *
 * 좌우가 갈리는 구역은 두 줄이 된다. 팔·다리는 좌우가 앵커에서 갈려서 구역 점이
 * 기준점 하나뿐이라 양쪽을 다 만들어 준다 — 목록에서는 어느 쪽 팔을 눌러 들어왔는지로
 * 정해지지만 검색은 그 단계를 건너뛴다.
 */
export function choicesForZone(anchor: BodyAnchor, zone: BodyZone): ZoneChoice[] {
  const sides: BodySide[] = isMirrored(anchor) ? ['LEFT', 'RIGHT'] : ['CENTER']
  const out: ZoneChoice[] = []
  sides.forEach((side) => {
    zoneChoices(anchor, side).forEach((c) => {
      if (c.zone.id !== zone.id) return
      if (out.some((o) => o.side === c.side)) return
      out.push(c)
    })
  })
  return out
}

export function findAnchor(id: string): BodyAnchor | undefined {
  return BODY_ANCHORS.find((a) => a.id === id)
}

/* ── 서버 부위 마스터 ──────────────────────────────────────────────
 * `GET /api/demo/body-map` — 백엔드가 들고 있는 부위 34곳(앵커 9 + 구역 25). AI 를 부르지 않는
 * 서버 사본이라 비용이 없고, 여기의 `id` 가 문답 시작의 `site_node_id` 다.
 *
 * 화면 좌표(`points`)와 그림은 서버에 없어서 여기 것을 쓴다. 서버에서 받는 것은 **이름과 별칭**이다 —
 * 온톨로지가 바뀌면 검색 별칭이나 표시명이 달라질 수 있고, 그것은 서버 것이 정본이다. id 가 맞는
 * 항목만 덮어쓰고, 서버에 닿지 못하면 이 파일의 사본 그대로다.
 */
interface ServerBodyNode {
  id: string
  label: string
  aliases?: string[]
  laterality?: string
}
interface ServerBodyMap {
  ontology_snapshot?: string
  anchors: (ServerBodyNode & { zones?: ServerBodyNode[] })[]
}

let synced: Promise<boolean> | null = null

/**
 * 서버 부위 마스터로 이름·별칭을 맞춘다. 한 세션에 한 번만 부르고, 두 번째부터는 같은 약속을 돌려준다.
 * 바뀐 것이 있으면 true. 부르는 화면은 그때 다시 그린다.
 */
export function syncBodyMapFromServer(): Promise<boolean> {
  if (synced) return synced
  if (!apiAvailable()) return Promise.resolve(false)
  synced = apiFetch<ServerBodyMap>('/api/demo/body-map')
    .then((data) => {
      let changed = false
      const apply = (local: { label: string; aliases: string[] }, remote: ServerBodyNode) => {
        if (remote.label && remote.label !== local.label) {
          local.label = remote.label
          changed = true
        }
        if (remote.aliases && remote.aliases.join('|') !== local.aliases.join('|')) {
          local.aliases.splice(0, local.aliases.length, ...remote.aliases)
          changed = true
        }
      }
      for (const ra of data.anchors ?? []) {
        const la = BODY_ANCHORS.find((a) => a.id === ra.id)
        if (!la) continue
        apply(la, ra)
        for (const rz of ra.zones ?? []) {
          const lz = la.zones.find((z) => z.id === rz.id)
          if (lz) apply(lz, rz)
        }
      }
      return changed
    })
    .catch(() => {
      synced = null
      return false
    })
  return synced
}
