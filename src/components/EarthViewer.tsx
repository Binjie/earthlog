"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CallbackProperty,
  CallbackPositionProperty,
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  Credit,
  HeightReference,
  ImageryLayer,
  Ion,
  Math as CesiumMath,
  NearFarScalar,
  PolylineGlowMaterialProperty,
  UrlTemplateImageryProvider,
  Viewer,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import styles from "./EarthViewer.module.css";

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

type Language = "en" | "zh";
type LocalText = Record<Language, string>;

type Movement = {
  label: LocalText;
  from: [number, number];
  to: [number, number];
  startYear: number;
  endYear: number;
};

type TimelineEvent = {
  id: string;
  year: number;
  title: LocalText;
  location: LocalText;
  summary: LocalText;
  coordinates: [number, number];
  cameraHeight: number;
  links: Array<{ label: LocalText; href: string }>;
  movements?: Movement[];
};

const START_YEAR = 1900;
const END_YEAR = new Date().getFullYear();

const copy = {
  en: {
    ariaTimeline: "History timeline",
    title: "History Globe",
    intro:
      "Explore modern history from 1900 onward. The range is intentionally compact so the content can grow event by event.",
    language: "Language",
    selectedYear: "Selected year",
    sources: "Links",
    motion: "Motion layer",
    motionBody:
      "A lightweight motion layer fits this project: glowing routes can show troop advances, fronts, evacuations, or weapons movement without detailed 3D models.",
    previous: "Previous event",
    next: "Next event",
  },
  zh: {
    ariaTimeline: "历史时间线",
    title: "历史事件地球仪",
    intro: "先从 1900 年之后的现代史开始做，内容规模更可控，后续可以逐步往前扩展。",
    language: "语言",
    selectedYear: "当前年份",
    sources: "文字与外部链接",
    motion: "动作层",
    motionBody:
      "可以加入简单动作：用发光路线、移动点表现部队推进、战线变化、撤离或武器移动，不需要一开始就做复杂 3D 模型。",
    previous: "上一个事件",
    next: "下一个事件",
  },
} satisfies Record<Language, Record<string, string>>;

const timelineEvents: TimelineEvent[] = [
  {
    id: "boxer-rebellion",
    year: 1900,
    title: { en: "Boxer Rebellion reaches Beijing", zh: "义和团运动与北京战事" },
    location: { en: "Beijing, China", zh: "中国北京" },
    summary: {
      en: "Foreign legations were besieged and an international expedition moved toward Beijing, making China a focal point of imperial rivalry at the start of the century.",
      zh: "使馆区被围、联军向北京推进，使中国在 20 世纪开端成为列强竞争和国内危机交叠的焦点。",
    },
    coordinates: [116.4074, 39.9042],
    cameraHeight: 4_200_000,
    links: [
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=Boxer+Rebellion+1900",
      },
      {
        label: { en: "Overview", zh: "资料概览" },
        href: "https://en.wikipedia.org/wiki/Boxer_Rebellion",
      },
    ],
    movements: [
      {
        label: { en: "Expedition route", zh: "联军推进路线" },
        from: [117.3616, 39.3434],
        to: [116.4074, 39.9042],
        startYear: 1900,
        endYear: 1901,
      },
    ],
  },
  {
    id: "wwi",
    year: 1914,
    title: { en: "World War I begins", zh: "第一次世界大战爆发" },
    location: { en: "Europe", zh: "欧洲" },
    summary: {
      en: "A regional crisis escalated into a global war, pulling empires and alliances into years of industrialized conflict.",
      zh: "一场区域危机升级为全球战争，帝国与联盟体系被卷入持续数年的工业化冲突。",
    },
    coordinates: [14.4378, 50.0755],
    cameraHeight: 7_000_000,
    links: [
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=World+War+I+explained",
      },
      { label: { en: "Overview", zh: "资料概览" }, href: "https://en.wikipedia.org/wiki/World_War_I" },
    ],
    movements: [
      {
        label: { en: "Western Front pressure", zh: "西线推进压力" },
        from: [2.3522, 48.8566],
        to: [4.3517, 50.8503],
        startYear: 1914,
        endYear: 1918,
      },
    ],
  },
  {
    id: "sino-japanese-war",
    year: 1937,
    title: { en: "Second Sino-Japanese War expands", zh: "全面抗战爆发" },
    location: { en: "China", zh: "中国" },
    summary: {
      en: "War expanded after the Marco Polo Bridge Incident, reshaping East Asia and later merging into the wider Second World War.",
      zh: "卢沟桥事变后战争全面扩大，深刻改变东亚格局，并最终汇入第二次世界大战。",
    },
    coordinates: [116.0164, 39.8494],
    cameraHeight: 5_200_000,
    links: [
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=Second+Sino-Japanese+War+1937",
      },
      {
        label: { en: "Overview", zh: "资料概览" },
        href: "https://en.wikipedia.org/wiki/Second_Sino-Japanese_War",
      },
    ],
    movements: [
      {
        label: { en: "Coastal advance", zh: "沿海战线移动" },
        from: [121.4737, 31.2304],
        to: [118.7969, 32.0603],
        startYear: 1937,
        endYear: 1938,
      },
    ],
  },
  {
    id: "wwii",
    year: 1939,
    title: { en: "World War II begins in Europe", zh: "第二次世界大战在欧洲爆发" },
    location: { en: "Poland", zh: "波兰" },
    summary: {
      en: "Germany invaded Poland, triggering declarations of war by Britain and France and widening the conflict across Europe.",
      zh: "德国入侵波兰，英国和法国随后宣战，欧洲战争迅速扩大。",
    },
    coordinates: [19.1451, 51.9194],
    cameraHeight: 6_200_000,
    links: [
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=World+War+II+begins+1939",
      },
      { label: { en: "Overview", zh: "资料概览" }, href: "https://en.wikipedia.org/wiki/World_War_II" },
    ],
    movements: [
      {
        label: { en: "Invasion axis", zh: "入侵方向" },
        from: [13.405, 52.52],
        to: [21.0122, 52.2297],
        startYear: 1939,
        endYear: 1940,
      },
    ],
  },
  {
    id: "un",
    year: 1945,
    title: { en: "United Nations founded", zh: "联合国成立" },
    location: { en: "San Francisco, United States", zh: "美国旧金山" },
    summary: {
      en: "After World War II, countries created a new institution for diplomacy, security, development, and international cooperation.",
      zh: "二战结束后，各国建立新的国际机构，用于外交、安全、发展与全球合作。",
    },
    coordinates: [-122.4194, 37.7749],
    cameraHeight: 5_500_000,
    links: [
      { label: { en: "UN history", zh: "联合国历史" }, href: "https://www.un.org/en/about-us/history-of-the-un" },
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=United+Nations+founded+1945",
      },
    ],
  },
  {
    id: "prc",
    year: 1949,
    title: { en: "People's Republic of China proclaimed", zh: "中华人民共和国成立" },
    location: { en: "Beijing, China", zh: "中国北京" },
    summary: {
      en: "A new government was proclaimed in Beijing, reshaping China's domestic politics and the international order in Asia.",
      zh: "新政权在北京宣告成立，改变了中国国内政治，也影响了亚洲国际秩序。",
    },
    coordinates: [116.3975, 39.9087],
    cameraHeight: 4_000_000,
    links: [
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=People%27s+Republic+of+China+1949",
      },
      {
        label: { en: "Overview", zh: "资料概览" },
        href: "https://en.wikipedia.org/wiki/Proclamation_of_the_People%27s_Republic_of_China",
      },
    ],
  },
  {
    id: "moon",
    year: 1969,
    title: { en: "Apollo 11 Moon landing", zh: "阿波罗 11 号登月" },
    location: { en: "Cape Canaveral / Moon", zh: "卡纳维拉尔角 / 月球" },
    summary: {
      en: "Apollo 11 turned Cold War space competition into a televised global moment and a milestone for human exploration.",
      zh: "阿波罗 11 号把冷战太空竞赛变成全球共同观看的历史时刻，也是人类探索的重要里程碑。",
    },
    coordinates: [-80.6043, 28.6084],
    cameraHeight: 7_200_000,
    links: [
      { label: { en: "NASA", zh: "NASA 资料" }, href: "https://www.nasa.gov/history/apollo-11/" },
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=Apollo+11+Moon+landing",
      },
    ],
    movements: [
      {
        label: { en: "Launch trajectory", zh: "发射轨迹示意" },
        from: [-80.6043, 28.6084],
        to: [-45, 8],
        startYear: 1969,
        endYear: 1970,
      },
    ],
  },
  {
    id: "berlin-wall",
    year: 1989,
    title: { en: "Berlin Wall falls", zh: "柏林墙倒塌" },
    location: { en: "Berlin, Germany", zh: "德国柏林" },
    summary: {
      en: "The opening of the Berlin Wall became a symbol of the Cold War's end and the political transformation of Europe.",
      zh: "柏林墙开放成为冷战结束和欧洲政治转型的象征。",
    },
    coordinates: [13.405, 52.52],
    cameraHeight: 4_000_000,
    links: [
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=Berlin+Wall+falls+1989",
      },
      { label: { en: "Overview", zh: "资料概览" }, href: "https://en.wikipedia.org/wiki/Fall_of_the_Berlin_Wall" },
    ],
  },
  {
    id: "september-11",
    year: 2001,
    title: { en: "September 11 attacks", zh: "九一一事件" },
    location: { en: "New York and Washington, D.C.", zh: "纽约与华盛顿" },
    summary: {
      en: "The attacks transformed global security policy, aviation, intelligence coordination, and the politics of the early 21st century.",
      zh: "事件改变了全球安全政策、航空体系、情报合作，以及 21 世纪初的政治方向。",
    },
    coordinates: [-74.006, 40.7128],
    cameraHeight: 4_200_000,
    links: [
      { label: { en: "Museum", zh: "纪念馆资料" }, href: "https://www.911memorial.org/learn/resources" },
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=September+11+attacks+history",
      },
    ],
  },
  {
    id: "financial-crisis",
    year: 2008,
    title: { en: "Global financial crisis", zh: "全球金融危机" },
    location: { en: "Global markets", zh: "全球市场" },
    summary: {
      en: "Failures in mortgage finance and banking spread through global markets, changing regulation and public views of risk.",
      zh: "按揭金融与银行体系的风险扩散到全球市场，改变了监管制度和公众对风险的认识。",
    },
    coordinates: [-74.006, 40.7128],
    cameraHeight: 8_000_000,
    links: [
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=2008+financial+crisis+explained",
      },
      {
        label: { en: "Overview", zh: "资料概览" },
        href: "https://en.wikipedia.org/wiki/2007%E2%80%932008_financial_crisis",
      },
    ],
  },
  {
    id: "pandemic",
    year: 2020,
    title: { en: "COVID-19 pandemic", zh: "新冠疫情全球暴发" },
    location: { en: "Worldwide", zh: "全球" },
    summary: {
      en: "A pandemic disrupted travel, work, health systems, supply chains, and everyday life across the world.",
      zh: "疫情影响全球旅行、工作方式、医疗系统、供应链和日常生活。",
    },
    coordinates: [30, 20],
    cameraHeight: 14_000_000,
    links: [
      { label: { en: "WHO", zh: "WHO 资料" }, href: "https://www.who.int/emergencies/diseases/novel-coronavirus-2019" },
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=COVID-19+pandemic+history",
      },
    ],
  },
  {
    id: "ukraine",
    year: 2022,
    title: { en: "Russia's full-scale invasion of Ukraine", zh: "俄乌战争全面升级" },
    location: { en: "Ukraine", zh: "乌克兰" },
    summary: {
      en: "Russia launched a full-scale invasion of Ukraine, reshaping European security, energy politics, migration, and global diplomacy.",
      zh: "俄罗斯对乌克兰发动全面入侵，重塑欧洲安全、能源政治、人口迁移与全球外交。",
    },
    coordinates: [31.1656, 48.3794],
    cameraHeight: 5_500_000,
    links: [
      {
        label: { en: "Video search", zh: "YouTube 视频搜索" },
        href: "https://www.youtube.com/results?search_query=Russia+Ukraine+war+2022+explained",
      },
      {
        label: { en: "Overview", zh: "资料概览" },
        href: "https://en.wikipedia.org/wiki/Russian_invasion_of_Ukraine",
      },
    ],
    movements: [
      {
        label: { en: "Advance toward Kyiv", zh: "向基辅方向推进" },
        from: [30.5234, 52.0976],
        to: [30.5234, 50.4501],
        startYear: 2022,
        endYear: 2023,
      },
    ],
  },
];

function getCurrentEvent(year: number) {
  return timelineEvents.reduce((latest, event) => (event.year <= year ? event : latest), timelineEvents[0]);
}

function interpolate(from: [number, number], to: [number, number], progress: number) {
  return [from[0] + (to[0] - from[0]) * progress, from[1] + (to[1] - from[1]) * progress] as [number, number];
}

export default function EarthViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const selectedYearRef = useRef(START_YEAR);
  const [language, setLanguage] = useState<Language>("en");
  const [selectedYear, setSelectedYear] = useState(START_YEAR);

  const activeEvent = useMemo(() => getCurrentEvent(selectedYear), [selectedYear]);
  const t = copy[language];

  useEffect(() => {
    selectedYearRef.current = selectedYear;
  }, [selectedYear]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    window.CESIUM_BASE_URL = "/cesium";
    Ion.defaultAccessToken = "";

    const viewer = new Viewer(containerRef.current, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      useBrowserRecommendedResolution: false,
      vrButton: false,
      baseLayer: new ImageryLayer(
        new UrlTemplateImageryProvider({
          url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          maximumLevel: 19,
          credit: new Credit("OpenStreetMap contributors"),
        }),
      ),
    });

    viewerRef.current = viewer;
    viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2);
    viewer.scene.postProcessStages.fxaa.enabled = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.camera.setView({
      destination: Cartesian3.fromDegrees(104, 22, 23_000_000),
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-90),
        roll: 0,
      },
    });

    timelineEvents.forEach((event) => {
      viewer.entities.add({
        id: `event-${event.id}`,
        name: event.title.en,
        position: Cartesian3.fromDegrees(event.coordinates[0], event.coordinates[1]),
        point: {
          color: Color.fromCssColorString("#f5c542"),
          outlineColor: Color.fromCssColorString("#141414"),
          outlineWidth: 2,
          pixelSize: new CallbackProperty(() => {
            const isActive = getCurrentEvent(selectedYearRef.current).id === event.id;
            return isActive ? 14 + Math.sin(Date.now() / 180) * 2 : 8;
          }, false),
          heightReference: HeightReference.CLAMP_TO_GROUND,
          scaleByDistance: new NearFarScalar(1_000_000, 1.5, 16_000_000, 0.55),
        },
        label: {
          text: event.title.en,
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          font: "13px Arial",
          pixelOffset: new Cartesian2(0, -22),
          showBackground: true,
          backgroundColor: Color.fromCssColorString("#05070dcc"),
          scaleByDistance: new NearFarScalar(2_000_000, 1, 10_000_000, 0.35),
        },
      });

      event.movements?.forEach((movement, index) => {
        const getProgress = () => {
          const span = Math.max(1, movement.endYear - movement.startYear);
          const rawProgress = (selectedYearRef.current - movement.startYear) / span;
          return Math.min(1, Math.max(0, rawProgress));
        };

        viewer.entities.add({
          id: `route-${event.id}-${index}`,
          name: movement.label.en,
          polyline: {
            positions: new CallbackProperty(() => {
              const progress = getProgress();
              const end = interpolate(movement.from, movement.to, progress);
              return [
                Cartesian3.fromDegrees(movement.from[0], movement.from[1], 35_000),
                Cartesian3.fromDegrees(end[0], end[1], 35_000),
              ];
            }, false),
            width: 4,
            material: new PolylineGlowMaterialProperty({
              color: Color.fromCssColorString("#ff725c"),
              glowPower: 0.22,
            }),
          },
        });

        viewer.entities.add({
          id: `unit-${event.id}-${index}`,
          name: movement.label.en,
          position: new CallbackPositionProperty(() => {
            const progress = getProgress();
            const point = interpolate(movement.from, movement.to, progress);
            return Cartesian3.fromDegrees(point[0], point[1], 80_000);
          }, false),
          point: {
            color: Color.fromCssColorString("#ff725c"),
            outlineColor: Color.WHITE,
            outlineWidth: 2,
            pixelSize: new CallbackProperty(() => 10 + Math.sin(Date.now() / 140) * 2, false),
          },
        });
      });
    });

    const handleResize = () => {
      viewer.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    viewer.entities.values.forEach((entity) => {
      if (entity.id.startsWith("event-")) {
        const event = timelineEvents.find((item) => entity.id === `event-${item.id}`);
        if (event && entity.label) {
          entity.label.text = new ConstantProperty(event.title[language]);
        }
      }
    });

    viewer.scene.requestRender();
  }, [language]);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        activeEvent.coordinates[0],
        activeEvent.coordinates[1],
        activeEvent.cameraHeight,
      ),
      duration: 0.9,
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-70),
        roll: 0,
      },
    });
  }, [activeEvent]);

  const jumpToEvent = (direction: -1 | 1) => {
    const currentIndex = timelineEvents.findIndex((event) => event.id === activeEvent.id);
    const nextIndex = Math.min(timelineEvents.length - 1, Math.max(0, currentIndex + direction));
    setSelectedYear(timelineEvents[nextIndex].year);
  };

  return (
    <main className={styles.shell}>
      <div className={styles.viewer} ref={containerRef} />
      <section className={styles.panel} aria-label={t.ariaTimeline}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>EarthLog</p>
            <h1>{t.title}</h1>
          </div>
          <div className={styles.language} aria-label={t.language}>
            <button
              className={language === "en" ? styles.activeLanguage : undefined}
              type="button"
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
            <button
              className={language === "zh" ? styles.activeLanguage : undefined}
              type="button"
              onClick={() => setLanguage("zh")}
            >
              中文
            </button>
          </div>
        </header>

        <p className={styles.intro}>{t.intro}</p>

        <div className={styles.eventCard}>
          <div className={styles.eventHeader}>
            <span>{activeEvent.year}</span>
            <strong>{activeEvent.location[language]}</strong>
          </div>
          <h2>{activeEvent.title[language]}</h2>
          <p>{activeEvent.summary[language]}</p>
          <div className={styles.links} aria-label={t.sources}>
            {activeEvent.links.map((link) => (
              <a href={link.href} key={link.href} rel="noreferrer" target="_blank">
                {link.label[language]}
              </a>
            ))}
          </div>
        </div>

        <div className={styles.controls}>
          <button type="button" onClick={() => jumpToEvent(-1)} disabled={activeEvent.id === timelineEvents[0].id}>
            {t.previous}
          </button>
          <label>
            <span>
              {t.selectedYear}: <strong>{selectedYear}</strong>
            </span>
            <input
              className={styles.timeline}
              type="range"
              min={START_YEAR}
              max={END_YEAR}
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              aria-label={t.ariaTimeline}
            />
          </label>
          <button
            type="button"
            onClick={() => jumpToEvent(1)}
            disabled={activeEvent.id === timelineEvents[timelineEvents.length - 1].id}
          >
            {t.next}
          </button>
        </div>

        <div className={styles.meta}>
          <span>{START_YEAR}</span>
          <strong>{selectedYear}</strong>
          <span>{END_YEAR}</span>
        </div>

        <aside className={styles.motionNote}>
          <strong>{t.motion}</strong>
          <span>{t.motionBody}</span>
        </aside>
      </section>
    </main>
  );
}
