import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  GitBranch,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";
import { labels, type State, type Task, type Skill } from "../shared/domain";

type Data = State & {
  connection: {
    ready: boolean;
    provider: string;
    textModel: string;
    imageModel: string;
    videoModel: string;
  };
};
type Page = "dashboard" | "organization" | "skills" | "settings";
const statusLabel: Record<string, string> = {
  planned: "계획 준비",
  running: "진행 중",
  failed: "확인 필요",
  awaiting_approval: "대표 승인 대기",
  completed: "완료",
  pending: "대기",
  succeeded: "완료",
};
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "요청 실패");
  return data;
}
export function App() {
  const [data, setData] = useState<Data>();
  const [page, setPage] = useState<Page>("dashboard");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [newTask, setNewTask] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [skill, setSkill] = useState<Skill>();
  async function refresh() {
    setData(await api<Data>("/state"));
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    const timer = setInterval(() => {
      void refresh().catch(() => {});
    }, 2500);
    return () => clearInterval(timer);
  }, []);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const task = data?.tasks.find((t) => t.id === selected);
  if (!data)
    return (
      <main className="loading">
        <LoaderCircle className="spin" />
        <h2>업무실을 준비하고 있습니다</h2>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  const nav = [
    { id: "dashboard", name: "대표 업무실", icon: LayoutDashboard },
    { id: "organization", name: "조직도", icon: GitBranch },
    { id: "skills", name: "Skills 라이브러리", icon: Sparkles },
    { id: "settings", name: "연결 설정", icon: Settings2 },
  ] as const;
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setPage("dashboard")}>
          <span className="logo">
            td<span>•</span>
          </span>
          <span>
            COMPANY<span className="brand-sub">YOUR AI ORGANIZATION</span>
          </span>
        </a>
        <div className="workspace">
          <Building2 size={19} />
          <div>
            {data.organization.company.name}
            <small>대표 워크스페이스</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "nav-item active" : "nav-item"}
              onClick={() => {
                setPage(n.id);
                setSelected(undefined);
              }}
            >
              <n.icon size={19} />
              {n.name}
              {n.id === "skills" && (
                <span className="nav-count">
                  {data.organization.skills.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="chief-dot" />
          <div>
            <b>실장 · 업무 오케스트레이터</b>
            <small>계획부터 최종 보고까지</small>
          </div>
        </div>
        <div className="profile">
          <span className="avatar">대표</span>
          <div>
            <b>대표님</b>
            <small>최종 의사결정자</small>
          </div>
          <ShieldCheck size={18} />
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            워크스페이스 <ChevronRight size={14} />{" "}
            <b>{nav.find((n) => n.id === page)?.name}</b>
          </span>
          <span
            className={`connection ${data.connection.ready ? "ready" : ""}`}
          >
            <i />
            {data.connection.ready ? "API 키 설정됨" : "AI 연결 대기"}
          </span>
        </header>
        <main className="main">
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button aria-label="오류 닫기" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert" role="status">
              {notice}
              <button aria-label="알림 닫기" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {page === "dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">CEO WORKSPACE</p>
                  <h1>
                    대표님의 생각을,
                    <br className="mobile-break" /> 팀의 실행으로.
                  </h1>
                  <p>
                    실장에게 업무를 맡기고, 각 분야의 담당 봇과 함께 완성하세요.
                  </p>
                </div>
                <button className="primary" onClick={() => setNewTask(true)}>
                  <Plus size={18} /> 새 업무 요청
                </button>
              </div>
              <section className="hero">
                <div>
                  <span className="pill">
                    <Sparkles size={14} /> 실장에게 요청하세요
                  </span>
                  <h2>어떤 일을 함께 시작할까요?</h2>
                  <p>
                    목표와 원하는 결과를 알려주시면
                    <br />
                    담당 팀과 실행 순서를 제안합니다.
                  </p>
                  <button className="hero-cta" onClick={() => setNewTask(true)}>
                    업무 브리프 작성 <ArrowRight size={18} />
                  </button>
                </div>
                <div
                  className="flow-illustration"
                  aria-label="대표에서 실장, 역할별 봇으로 업무 전달"
                >
                  <div className="flow-boss">
                    대표 <span>방향과 목표</span>
                  </div>
                  <div className="flow-line" />
                  <div className="flow-chief">
                    <Sparkles size={17} /> 실장 <span>계획 · 배정 · 보고</span>
                  </div>
                  <div className="flow-branches" />
                  <div className="flow-teams">
                    <span>기획</span>
                    <span>제작</span>
                    <span>개발</span>
                    <span>검수</span>
                  </div>
                </div>
              </section>
              <div className="metrics">
                {[
                  { label: "전체 업무", n: data.tasks.length, icon: FileText },
                  {
                    label: "진행 중",
                    n: data.tasks.filter((t) => t.status === "running").length,
                    icon: LoaderCircle,
                  },
                  {
                    label: "대표 승인 대기",
                    n: data.tasks.filter(
                      (t) => t.status === "awaiting_approval",
                    ).length,
                    icon: ShieldCheck,
                  },
                  {
                    label: "배정 가능한 역할",
                    n: data.organization.roles.length,
                    icon: Users,
                  },
                ].map((m) => (
                  <div className="metric" key={m.label}>
                    <span className="metric-icon">
                      <m.icon size={20} />
                    </span>
                    <div>
                      <small>{m.label}</small>
                      <b>
                        {m.n}
                        <span>개</span>
                      </b>
                    </div>
                  </div>
                ))}
              </div>
              <div className="section-title">
                <h2>
                  업무 현황 <span>{data.tasks.length}</span>
                </h2>
                <span>계획 → 역할별 실행 → 검수 → 대표 승인</span>
              </div>
              {data.tasks.length === 0 ? (
                <section className="empty">
                  <span className="empty-icon">
                    <FileText size={28} />
                  </span>
                  <h3>첫 업무를 요청해 보세요</h3>
                  <p>
                    예: “신규 서비스 출시를 위한 배너와 소개 페이지를 준비해
                    줘.”
                  </p>
                  <button
                    className="secondary"
                    onClick={() => setNewTask(true)}
                  >
                    실장에게 업무 요청 <ArrowRight size={16} />
                  </button>
                </section>
              ) : (
                <section className="task-list">
                  {data.tasks.map((t) => (
                    <button
                      className={`task-row ${selected === t.id ? "selected" : ""}`}
                      key={t.id}
                      onClick={() =>
                        setSelected(selected === t.id ? undefined : t.id)
                      }
                    >
                      <span className="task-symbol">
                        <FileText size={20} />
                      </span>
                      <div>
                        <b>{t.title}</b>
                        <small>
                          {t.steps.map((s) => s.role.name).join(" → ")}
                        </small>
                      </div>
                      <span className={`badge ${t.status}`}>
                        {statusLabel[t.status]}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </section>
              )}
              {task && (
                <TaskDetail
                  task={task}
                  ready={data.connection.ready}
                  busy={busy}
                  run={() =>
                    action(async () => {
                      await api(`/tasks/${task.id}/run`, "POST");
                    })
                  }
                  approve={() =>
                    action(async () => {
                      await api(`/tasks/${task.id}/approve`, "POST");
                    })
                  }
                />
              )}
              <div className="footnote">
                <ShieldCheck size={16} /> 모든 산출물은 대표님의 최종 승인 후
                완료 처리됩니다.
              </div>
            </>
          )}
          {page === "organization" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ORGANIZATION</p>
                  <h1>함께 일하는 우리 팀</h1>
                  <p>{data.organization.company.description}</p>
                </div>
                <div className="button-row">
                  <a className="secondary" href="/api/organization/export">
                    JSON 내보내기
                  </a>
                  <label className="primary upload">
                    <Upload size={16} /> 조직도 가져오기
                    <input
                      type="file"
                      accept=".json,application/json"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          void action(async () => {
                            if (file.size > 5_000_000)
                              throw new Error(
                                "5MB 이하 JSON 파일을 선택하세요.",
                              );
                            await api(
                              "/organization/import",
                              "POST",
                              JSON.parse(await file.text()),
                            );
                            setNotice(
                              "조직도와 skills를 가져왔습니다. 기존 업무는 생성 당시의 역할과 skill을 유지합니다.",
                            );
                          });
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="import-note">
                <FileText size={18} />
                <p>
                  td-hr.app 분석 결과는 준비되는 대로 가져올 수 있습니다. 현재는
                  예시 조직이며, JSON 형식은 내보낸 파일을 기준으로 맞춰 주세요.
                </p>
              </div>
              <div className="org-root">
                <span className="avatar">대표</span>
                <b>대표님</b>
                <small>목표 설정 · 최종 승인</small>
              </div>
              <ArrowDown className="org-arrow" size={20} />
              <div className="org-chief">
                <Sparkles size={22} />
                <div>
                  <b>실장</b>
                  <small>업무 계획 · 역할 배정 · 결과 취합</small>
                </div>
              </div>
              <div className="role-grid">
                {data.organization.roles.map((r) => (
                  <article className="role-card" key={r.id}>
                    <span className={`category-icon ${r.category}`}>
                      {labels[r.category].slice(0, 1)}
                    </span>
                    <span className="role-category">{labels[r.category]}</span>
                    <h3>{r.name}</h3>
                    <p>{r.description}</p>
                    <div className="role-meta">
                      <span>보고 대상</span>
                      <b>
                        {data.organization.roles.find(
                          (p) => p.id === r.reportsTo,
                        )?.name || "실장"}
                      </b>
                    </div>
                    <div className="skill-tags">
                      {r.skillIds.map((id) => (
                        <button
                          key={id}
                          onClick={() => {
                            setPage("skills");
                            setSkill(
                              data.organization.skills.find((s) => s.id === id),
                            );
                          }}
                        >
                          <Sparkles size={12} />
                          {
                            data.organization.skills.find((s) => s.id === id)
                              ?.name
                          }
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {page === "skills" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">SKILLS LIBRARY</p>
                  <h1>역할마다, 일하는 방식</h1>
                  <p>
                    담당 봇의 전문 지침을 관리합니다. 저장한 변경은 새로 만드는
                    업무에 적용됩니다.
                  </p>
                </div>
                <span className="pill">
                  {data.organization.skills.length} skills
                </span>
              </div>
              <div className="skills-layout">
                <div className="skill-menu">
                  {data.organization.skills.map((s) => (
                    <button
                      className={skill?.id === s.id ? "selected" : ""}
                      key={s.id}
                      onClick={() => setSkill(s)}
                    >
                      <Sparkles size={18} />
                      <span>
                        {s.name}
                        <small>
                          {data.organization.roles
                            .filter((r) => r.skillIds.includes(s.id))
                            .map((r) => r.name)
                            .join(", ")}
                        </small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
                <section className="skill-editor">
                  {skill ? (
                    <>
                      <h2>{skill.name}</h2>
                      <p>
                        Markdown 형식으로 역할, 절차, 산출물과 검수 기준을
                        작성하세요.
                      </p>
                      <label className="secondary upload">
                        <Upload size={15} /> Markdown 불러오기
                        <input
                          type="file"
                          accept=".md,.txt,text/plain,text/markdown"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              void action(async () => {
                                if (file.size > 100_000)
                                  throw new Error(
                                    "100KB 이하 파일을 선택하세요.",
                                  );
                                setSkill({
                                  ...skill,
                                  instructions: await file.text(),
                                });
                              });
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <label className="sr-only" htmlFor="instructions">
                        Skill 지침
                      </label>
                      <textarea
                        id="instructions"
                        value={skill.instructions}
                        onChange={(e) =>
                          setSkill({ ...skill, instructions: e.target.value })
                        }
                      />
                      <button
                        className="primary"
                        disabled={busy || !skill.instructions.trim()}
                        onClick={() =>
                          action(async () => {
                            await api(`/skills/${skill.id}`, "PUT", {
                              instructions: skill.instructions,
                            });
                            setNotice("Skill 지침을 저장했습니다.");
                          })
                        }
                      >
                        <Check size={16} /> 지침 저장
                      </button>
                    </>
                  ) : (
                    <div className="empty">
                      <Sparkles size={30} />
                      <h3>편집할 skill을 선택하세요</h3>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
          {page === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">CONNECTIONS</p>
                  <h1>실행을 위한 연결</h1>
                  <p>조직과 업무 데이터는 이 환경에 저장됩니다.</p>
                </div>
              </div>
              <section className="settings-card">
                <div className="section-title">
                  <h2>AI 실행 서비스</h2>
                  <span
                    className={`badge ${data.connection.ready ? "succeeded" : "pending"}`}
                  >
                    {data.connection.ready
                      ? "키 설정됨 · 실행 시 검증"
                      : "연결 필요"}
                  </span>
                </div>
                <p>
                  기획·개발·운영·검수는 텍스트 모델, 이미지와 영상은 각각의 생성
                  API를 사용합니다. 실행 버튼을 누르면 실제 API 호출이
                  발생합니다.
                </p>
                <dl>
                  <dt>텍스트</dt>
                  <dd>{data.connection.textModel}</dd>
                  <dt>이미지</dt>
                  <dd>{data.connection.imageModel}</dd>
                  <dt>영상</dt>
                  <dd>{data.connection.videoModel}</dd>
                </dl>
                <div className="import-note">
                  <Settings2 size={20} />
                  <p>
                    환경 설정에서 <code>AI_API_KEY</code>를 안전하게 등록한 뒤
                    서버를 다시 시작하세요. API 키는 브라우저에 저장하거나
                    표시하지 않습니다.
                  </p>
                </div>
                <p className="muted">
                  현재 버전은 개인 개발 환경용입니다. 개발 봇은 코드 초안을
                  작성하며, 코드 실행·배포는 연결되지 않았습니다. 이미지·영상의
                  최종 시각 검수는 대표가 수행합니다.
                </p>
              </section>
            </>
          )}
        </main>
      </div>
      {newTask && (
        <NewTask
          roles={data.organization.roles}
          busy={busy}
          close={() => setNewTask(false)}
          submit={(input) =>
            action(async () => {
              const task = await api<Task>("/tasks", "POST", input);
              setSelected(task.id);
              setNewTask(false);
              setPage("dashboard");
            })
          }
        />
      )}
    </div>
  );
}
function TaskDetail({
  task,
  ready,
  busy,
  run,
  approve,
}: {
  task: Task;
  ready: boolean;
  busy: boolean;
  run: () => void;
  approve: () => void;
}) {
  return (
    <section className="task-detail">
      <div className="section-title">
        <div>
          <p className="eyebrow">CHIEF'S BRIEFING</p>
          <h2>{task.title}</h2>
        </div>
        {["planned", "failed"].includes(task.status) && (
          <button className="primary" disabled={!ready || busy} onClick={run}>
            <Send size={16} />
            {task.status === "failed"
              ? "실패 단계부터 재시도"
              : "계획 확인 · 실행"}
          </button>
        )}
        {task.status === "awaiting_approval" && (
          <button className="primary" disabled={busy} onClick={approve}>
            <CheckCircle2 size={16} /> 최종 승인
          </button>
        )}
      </div>
      <p className="brief">{task.brief}</p>
      {!ready && (
        <p className="import-note">
          업무 계획은 준비되었습니다. 실제 실행에는 AI API 연결이 필요합니다.
        </p>
      )}
      <div className="steps">
        {task.steps.map((step, i) => (
          <details
            className="step"
            key={step.id}
            open={step.status === "failed"}
          >
            <summary>
              <span className={`step-number ${step.status}`}>
                {step.status === "succeeded" ? (
                  <Check size={15} />
                ) : step.status === "running" ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  i + 1
                )}
              </span>
              <b>{step.role.name}</b>
              <small>{step.skills.map((s) => s.name).join(", ")}</small>
              <span className={`badge ${step.status}`}>
                {statusLabel[step.status]}
              </span>
            </summary>
            <div className="step-content">
              {step.error && <p className="error-text">{step.error}</p>}
              {step.artifact?.text && <pre>{step.artifact.text}</pre>}
              {step.artifact?.kind === "image" && (
                <img
                  className="artifact-image"
                  alt={`${step.role.name} 생성 이미지`}
                  src={`/api/tasks/${task.id}/artifacts/${step.id}`}
                />
              )}
              {step.artifact?.kind === "video" && (
                <video
                  controls
                  src={`/api/tasks/${task.id}/artifacts/${step.id}`}
                />
              )}
              {step.artifact ? (
                <a
                  className="secondary"
                  href={`/api/tasks/${task.id}/artifacts/${step.id}`}
                  download
                >
                  산출물 다운로드
                </a>
              ) : (
                <p>산출물이 도착하면 여기에 표시됩니다.</p>
              )}
            </div>
          </details>
        ))}
      </div>
      <div className="timeline">
        {task.events.map((e, i) => (
          <p key={i}>
            <Circle size={7} />
            <time>
              {new Date(e.at).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Seoul",
              })}
            </time>
            {e.message}
          </p>
        ))}
      </div>
    </section>
  );
}
function NewTask({
  roles,
  busy,
  close,
  submit,
}: {
  roles: Data["organization"]["roles"];
  busy: boolean;
  close: () => void;
  submit: (input: { title: string; brief: string; roleIds: string[] }) => void;
}) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) close();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [busy, close]);
  return (
    <div className="modal-overlay">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-task-title"
      >
        <button
          className="modal-close"
          disabled={busy}
          onClick={close}
          aria-label="닫기"
        >
          <X size={21} />
        </button>
        <p className="eyebrow">NEW REQUEST</p>
        <h2 id="new-task-title">실장에게 업무 요청</h2>
        <p>원하는 결과를 알려주세요. 먼저 실행 계획을 만들어 드립니다.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit({ title, brief, roleIds });
          }}
        >
          <label>
            업무 제목
            <input
              autoFocus
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 신규 서비스 출시 콘텐츠 준비"
            />
          </label>
          <label>
            업무 브리프
            <textarea
              required
              minLength={10}
              maxLength={12000}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="목표, 대상 고객, 필요한 산출물, 일정과 참고사항을 알려주세요."
            />
          </label>
          <fieldset>
            <legend>
              담당 역할 <small>선택하지 않으면 키워드 규칙으로 자동 배정</small>
            </legend>
            <div className="role-options">
              {roles.map((r) => (
                <label key={r.id}>
                  <input
                    type="checkbox"
                    checked={roleIds.includes(r.id)}
                    onChange={(e) =>
                      setRoleIds(
                        e.target.checked
                          ? [...roleIds, r.id]
                          : roleIds.filter((id) => id !== r.id),
                      )
                    }
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="modal-footer">
            <span>계획 생성 시에는 API를 호출하지 않습니다.</span>
            <button
              className="primary"
              disabled={
                busy || title.trim().length === 0 || brief.trim().length < 10
              }
            >
              <Sparkles size={17} /> 실행 계획 만들기
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
