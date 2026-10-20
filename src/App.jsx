import { useEffect, useState } from "react";
import {
  HashRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { apiFetch } from "./api";
import { useUser } from "./context/useUser";
import "./App.css";

const EMPTY_COURSE = {
  name: "",
  durationDays: "",
  topics: "",
  price: "",
  maxStudents: "",
  status: "Open",
};

function LoadingScreen() {
  return <div className="center-message">Loading...</div>;
}

function ProtectedRoute({ roles }) {
  const { user, loading } = useUser();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RoleHome() {
  const { user, loading } = useUser();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Navigate
      to={user.role === "Teacher" ? "/teacher/courses" : "/courses"}
      replace
    />
  );
}

function AppShell() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          CourseHub
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          {user.role === "Student" ? (
            <>
              <NavLink to="/courses">Browse courses</NavLink>
              <NavLink to="/my-courses">My courses</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/teacher/courses">My courses</NavLink>
              <NavLink to="/teacher/courses/new">Create course</NavLink>
            </>
          )}
        </nav>
        <div className="account-block">
          <span>
            {user.username} <small>{user.role}</small>
          </span>
          <button className="button button-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}

function LoginPage() {
  const { user, loading, login } = useUser();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const loggedInUser = await login(identifier, password);
      navigate(
        loggedInUser.role === "Teacher" ? "/teacher/courses" : "/courses",
        { replace: true },
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <div className="eyebrow">Online Course Service</div>
        <h1>Welcome back</h1>
        <p>Sign in as a Student or Teacher to continue.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            Username or email
            <input
              autoFocus
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="student1 or student1@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
            />
          </label>
          <button className="button button-primary" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="demo-note">
          Demo: <strong>student1</strong> or <strong>teacher1</strong> /{" "}
          <strong>Demo123!</strong>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`status status-${status.toLowerCase()}`}>{status}</span>;
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(price);
}

function CourseCard({ course, teacherView = false }) {
  const detailsPath = teacherView
    ? `/teacher/courses/${course.id}`
    : `/courses/${course.id}`;

  return (
    <article className="course-card">
      <div className="course-card-top">
        <StatusBadge status={course.status} />
        <span className="price">{formatPrice(course.price)}</span>
      </div>
      <h2>{course.name}</h2>
      <p className="muted">Taught by {course.teacherName}</p>
      <div className="topic-list">
        {course.topics.map((topic) => (
          <span key={topic}>{topic}</span>
        ))}
      </div>
      <dl className="course-stats">
        <div>
          <dt>Duration</dt>
          <dd>{course.durationDays} days</dd>
        </div>
        <div>
          <dt>Enrollment</dt>
          <dd>
            {course.enrolledCount}/{course.maxStudents}
          </dd>
        </div>
      </dl>
      <Link className="button button-secondary" to={detailsPath}>
        View details
      </Link>
    </article>
  );
}

function CourseListPage({ enrolledOnly = false }) {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams();
    if (enrolledOnly) query.set("enrolled", "true");
    if (appliedSearch) query.set("q", appliedSearch);

    apiFetch(`/api/course?${query.toString()}`)
      .then((data) => {
        if (active) setCourses(data.courses);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enrolledOnly, appliedSearch]);

  function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAppliedSearch(search.trim());
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Student dashboard</div>
          <h1>{enrolledOnly ? "My enrolled courses" : "Browse courses"}</h1>
          <p>
            {enrolledOnly
              ? "Courses you have joined."
              : "Open and closed courses are shown; cancelled courses are hidden."}
          </p>
        </div>
        <form className="search-form" onSubmit={handleSearch}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Course or Teacher name"
            aria-label="Search courses"
          />
          <button className="button button-primary">Search</button>
        </form>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <LoadingScreen />
      ) : courses.length === 0 ? (
        <div className="empty-state">No matching courses found.</div>
      ) : (
        <div className="course-grid">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}

function TeacherCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/api/course")
      .then((data) => {
        if (active) setCourses(data.courses);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Teacher dashboard</div>
          <h1>My courses</h1>
          <p>Create, review, and update courses that you own.</p>
        </div>
        <Link className="button button-primary" to="/teacher/courses/new">
          Create course
        </Link>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <LoadingScreen />
      ) : courses.length === 0 ? (
        <div className="empty-state">You have not created a course yet.</div>
      ) : (
        <div className="course-grid">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} teacherView />
          ))}
        </div>
      )}
    </section>
  );
}

function CourseDetailsPage() {
  const { id } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [acting, setActing] = useState(false);

  async function loadCourse() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/api/course/${id}`);
      setCourse(data.course);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiFetch(`/api/course/${id}`)
      .then((data) => {
        if (active) setCourse(data.course);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function handleEnroll() {
    setActing(true);
    setError("");
    setActionMessage("");
    try {
      const data = await apiFetch(`/api/course/${id}/enroll`, { method: "POST" });
      setActionMessage(data.message);
      await loadCourse();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this course? This cannot be undone.")) return;
    setActing(true);
    setError("");
    try {
      await apiFetch(`/api/course/${id}`, { method: "DELETE" });
      navigate("/teacher/courses", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setActing(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error && !course) return <div className="alert alert-error">{error}</div>;
  if (!course) return null;

  const canEnroll =
    user.role === "Student" &&
    course.status === "Open" &&
    course.seatsAvailable > 0 &&
    !course.isEnrolled;

  return (
    <section className="details-layout">
      <div className="details-main">
        <div className="course-card-top">
          <StatusBadge status={course.status} />
          <span className="price">{formatPrice(course.price)}</span>
        </div>
        <h1>{course.name}</h1>
        <p className="lead">Taught by {course.teacherName}</p>
        <div className="topic-list large">
          {course.topics.map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
        <dl className="details-grid">
          <div>
            <dt>Duration</dt>
            <dd>{course.durationDays} days</dd>
          </div>
          <div>
            <dt>Maximum Students</dt>
            <dd>{course.maxStudents}</dd>
          </div>
          <div>
            <dt>Enrolled</dt>
            <dd>{course.enrolledCount}</dd>
          </div>
          <div>
            <dt>Seats available</dt>
            <dd>{course.seatsAvailable}</dd>
          </div>
        </dl>
        {error && <div className="alert alert-error">{error}</div>}
        {actionMessage && <div className="alert alert-success">{actionMessage}</div>}

        {user.role === "Student" ? (
          <button
            className="button button-primary"
            disabled={!canEnroll || acting}
            onClick={handleEnroll}
          >
            {course.isEnrolled
              ? "Already enrolled"
              : course.status !== "Open"
                ? "Enrollment closed"
                : course.seatsAvailable === 0
                  ? "Course full"
                  : acting
                    ? "Enrolling..."
                    : "Enroll now"}
          </button>
        ) : (
          <div className="button-row">
            <Link className="button button-primary" to={`/teacher/courses/${id}/edit`}>
              Edit course
            </Link>
            <button
              className="button button-danger"
              disabled={acting || course.enrolledCount > 0}
              onClick={handleDelete}
              title={course.enrolledCount > 0 ? "Courses with enrollment cannot be deleted" : ""}
            >
              Delete course
            </button>
          </div>
        )}
      </div>

      {user.role === "Teacher" && (
        <aside className="students-panel">
          <h2>Enrolled Students</h2>
          {course.enrolledStudents.length === 0 ? (
            <p className="muted">No Students have enrolled yet.</p>
          ) : (
            <ul className="student-list">
              {course.enrolledStudents.map((student) => (
                <li key={student.id}>
                  <strong>{student.username}</strong>
                  <span>{student.email}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </section>
  );
}

function CourseFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_COURSE);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing) return undefined;
    let active = true;
    apiFetch(`/api/course/${id}`)
      .then((data) => {
        if (!active) return;
        const course = data.course;
        setForm({
          name: course.name,
          durationDays: String(course.durationDays),
          topics: course.topics.join(", "),
          price: String(course.price),
          maxStudents: String(course.maxStudents),
          status: course.status,
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isEditing]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...form,
        durationDays: Number(form.durationDays),
        price: Number(form.price),
        maxStudents: Number(form.maxStudents),
        topics: form.topics
          .split(",")
          .map((topic) => topic.trim())
          .filter(Boolean),
      };
      const data = await apiFetch(isEditing ? `/api/course/${id}` : "/api/course", {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      navigate(`/teacher/courses/${data.course.id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <section className="form-page">
      <div className="eyebrow">Teacher dashboard</div>
      <h1>{isEditing ? "Edit course" : "Create a course"}</h1>
      <p>All fields are required. Separate multiple topics with commas.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="course-form" onSubmit={handleSubmit}>
        <label className="full-width">
          Course name
          <input required name="name" value={form.name} onChange={updateField} />
        </label>
        <label>
          Duration (days)
          <input
            required
            min="1"
            step="1"
            type="number"
            name="durationDays"
            value={form.durationDays}
            onChange={updateField}
          />
        </label>
        <label>
          Price (THB)
          <input
            required
            min="0"
            step="0.01"
            type="number"
            name="price"
            value={form.price}
            onChange={updateField}
          />
        </label>
        <label className="full-width">
          Topics
          <input
            required
            name="topics"
            value={form.topics}
            onChange={updateField}
            placeholder="React, Routing, API integration"
          />
        </label>
        <label>
          Max Student
          <input
            required
            min="1"
            step="1"
            type="number"
            name="maxStudents"
            value={form.maxStudents}
            onChange={updateField}
          />
        </label>
        <label>
          Status
          <select name="status" value={form.status} onChange={updateField}>
            <option>Open</option>
            <option>Close</option>
            <option>Cancel</option>
          </select>
        </label>
        <div className="button-row full-width">
          <button className="button button-primary" disabled={submitting}>
            {submitting ? "Saving..." : isEditing ? "Save changes" : "Create course"}
          </button>
          <button className="button button-ghost" type="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function NotFoundPage() {
  return (
    <div className="empty-state">
      <h1>Page not found</h1>
      <Link className="button button-primary" to="/">
        Return home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RoleHome />} />

        <Route element={<ProtectedRoute roles={["Student"]} />}>
          <Route element={<AppShell />}>
            <Route path="/courses" element={<CourseListPage />} />
            <Route path="/my-courses" element={<CourseListPage enrolledOnly />} />
            <Route path="/courses/:id" element={<CourseDetailsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={["Teacher"]} />}>
          <Route element={<AppShell />}>
            <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
            <Route path="/teacher/courses/new" element={<CourseFormPage />} />
            <Route path="/teacher/courses/:id" element={<CourseDetailsPage />} />
            <Route path="/teacher/courses/:id/edit" element={<CourseFormPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  );
}
