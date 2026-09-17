/** 시연용 데이터 한 벌
 *
 * 주소에 `?demo=1` 을 붙여 열면 이 상태로 시작한다. 30단계를 처음부터 밟지 않고
 * 캘린더·기록 화면부터 보여주고 싶을 때 쓴다. `?demo=0` 은 저장된 것을 모두 지운다.
 *
 * 날짜는 여는 날 기준으로 계산한다 — 진료는 이틀 뒤, 재방문은 그 일주일 뒤다.
 * 그래야 언제 열어도 D-day 가 자연스럽다.
 */
import { AXIS_FINDINGS, AXIS_FOLLOW_UP, AXIS_MEDICATION, AXIS_TESTS } from '../lib/types'
import type { AppState } from '../lib/types'
import { addDays, formatMonthDay, todayKey } from '../lib/date'

export function demoState(): AppState {
  const today = todayKey()
  const visitedOn = addDays(today, 2)
  const followUpDate = addDays(visitedOn, 7)

  return {
    version: 1,
    authed: true,
    onboardingDone: true,
    profile: { name: '고OO', age: 34, sex: 'M' },
    health: {
      medications: ['혈압약', '진통제'],
      conditions: ['고혈압'],
      allergies: ['페니실린'],
    },
    cards: [
      {
        id: 'card_demo',
        title: '오른쪽 윗배(명치) · 3주',
        writtenOn: today,
        items: [
          { key: '부위', value: '명치' },
          { key: '시작', value: '3주 전부터 서서히' },
          { key: '양상', value: '쓰리고 타는 것 같은 느낌' },
          { key: '뻗치는 곳', value: '그 자리에만 있어요' },
          { key: '동반증상', value: '속이 더부룩하고 트림이 자주 나요' },
          { key: '경과', value: '심해졌어요' },
          { key: '심해질 때', value: '밥 먹고 30분쯤 지나면 제일 쓰리고, 밤에 누우면 더 심해요.' },
        ],
        severity: 3,
        health: [
          { key: '복용약', value: '혈압약 · 진통제' },
          { key: '기저질환', value: '고혈압' },
        ],
        allergies: ['페니실린'],
        questions: [
          '고혈압 때문에 복용 중인 혈압약이 이 증상과 관련이 있을까요?',
          '속이 더부룩하고 트림이 자주 나는 건 어떤 상태인가요?',
          '지금 먹는 진통제를 계속 먹어도 되나요?',
        ],
        hospital: {
          name: '서울삼성내과의원',
          address: '서울특별시 용산구 이촌로 206, 국민은행 3~4층 (이촌동)',
        },
        visited: true,
        status: 'CONFIRMED',
      },
    ],
    appointments: [
      {
        id: 'appt_demo_1',
        date: visitedOn,
        time: '10:30',
        hospitalName: '서울삼성내과의원',
        cardId: 'card_demo',
        todos: [
          { id: 'todo_1', text: '아침 공복으로 가기 (피검사 할 수 있어서)', done: false },
          { id: 'todo_2', text: '먹고 있는 약 사진 찍어두기', done: true },
          { id: 'todo_3', text: '밤에 깬 날짜 메모해 가기', done: false },
        ],
        followUp: false,
        confirmed: true,
      },
      {
        id: 'appt_demo_2',
        date: followUpDate,
        time: '10:30',
        hospitalName: '서울삼성내과의원',
        cardId: 'card_demo',
        todos: [],
        followUp: true,
        confirmed: true,
      },
    ],
    records: [
      {
        id: 'rec_demo',
        cardId: 'card_demo',
        cardTitle: '오른쪽 윗배(명치) · 3주',
        clinic: '서울삼성내과의원',
        visitedOn,
        items: [
          { axis: AXIS_FINDINGS, key: '소견', value: '위염 초기' },
          { axis: AXIS_TESTS, key: '검사', value: '피검사 했다' },
          { axis: AXIS_MEDICATION, key: '약', value: '위산약 2주' },
          {
            axis: AXIS_FOLLOW_UP,
            key: '재방문',
            value: `일주일 뒤 (${formatMonthDay(followUpDate)} 전후)`,
            tone: 'link',
          },
        ],
        followUp: { date: followUpDate, approximate: true },
        patientNotes: [],
        rawMemo:
          '위염 초기라고 하셨어요. 피검사 했다고 하셨어요. 위산약 2주 처방. 일주일 뒤 재방문이라고 하셨어요.',
        createdAt: new Date().toISOString(),
      },
    ],
    intake: null,
  }
}
