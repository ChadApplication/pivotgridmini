# PivotGrid 개발 로드맵: Silverlight PivotViewer의 재해석

이 문서는 Microsoft Silverlight PivotViewer의 핵심 기능을 분석하고, 이를 현대적인 웹 기술로 구현하기 위한 단계별 작업 목록을 정의합니다.

---

## 1. Silverlight PivotViewer 핵심 메커니즘 분석

### A. 다면적 탐색 (Faceted Navigation)
단순한 검색이 아닌, 데이터의 속성(Metadata)을 기반으로 한 다차원적 필터링 시스템입니다.
- **범주형(String)**: 체크박스 기반의 다중 선택. 선택 시 즉각적인 레이아웃 재배치.
- **수치형(Numeric)**: 데이터 분포를 보여주는 **히스토그램**과 결합된 범위 슬라이더.
- **시간형(DateTime)**: 연/월/일 단위의 계층적 타임라인 탐색.

### B. 시각적 연속성 (Visual Continuity)
- **FLIP Animation**: 상태 변화(필터링, 정렬, 그룹핑) 시 아이템이 사라지는 것이 아니라 새로운 위치로 부드럽게 이동.
- **Deep Zoom (DZI)**: 수만 개의 고해상도 이미지를 성능 저하 없이 탐색. 줌 레벨에 따른 정보 상세도 변화(Semantic Zoom).

---

## 2. 단계별 구현 작업 목록 (Task List)

### Phase 1: 기반 시스템 구축 (현재 완료)
- [x] React + Vite + Tailwind 기반 환경 설정
- [x] 기본 Grid Layout 및 데이터 모델링
- [x] Framer Motion을 이용한 레이아웃 전이(Transition)
- [x] 기본 범주형(String) 필터 및 실시간 검색

### Phase 2: 시각적 분석 기능 강화 (Next Step)
- [ ] **Stacked View 고도화**: 그룹별 아이템 적재(Stacking) 로직 최적화.
- [ ] **Multi-Level Sorting**: 1차 그룹핑 후 2차 내부 정렬 기능 추가.
- [ ] **Detail Modal 확장**: 풍부한 메타데이터 표시 및 연관 항목 링크.

### Phase 3: 수치형 및 시간형 Facet 구현
- [ ] **Histogram Range Slider**: 수치 데이터(예: 발행 연도) 분포 시각화 및 범위 필터링.
- [ ] **Date Timeline Explorer**: 시간 흐름에 따른 데이터 필터링 인터페이스.

### Phase 4: 성능 및 데이터 확장성 (Advanced)
- [ ] **Zero-Prep Data Engine**: CSV/Excel 드래그앤드롭 파싱 및 자동 Facet 생성.
- [ ] **Virtualization & Canvas**: 수천 개 이상의 아이템 처리를 위한 렌더링 최적화.
- [ ] **Semantic Zoom**: 줌 레벨에 따른 카드 디자인 자동 변경.

---

## 3. 구현 우선순위 제안

1. **히스토그램 슬라이더**: 데이터 분포를 한눈에 보며 필터링하는 PivotViewer의 정수.
2. **연관 탐색(Linked Navigation)**: 상세 보기에서 특정 속성을 클릭하면 즉시 해당 조건으로 필터링되는 흐름.
3. **데이터 자동 인식**: 사용자 자신의 CSV 데이터를 즉시 시각화할 수 있는 인터페이스.
