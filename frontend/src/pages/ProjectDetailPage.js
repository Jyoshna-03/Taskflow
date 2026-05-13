import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';
import { projectsAPI, tasksAPI, usersAPI } from '../api';
import { useAuth } from '../context/AuthContext';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const STATUSES  = ['Todo', 'In Progress', 'In Review', 'Done'];
const PRIORITIES= ['Low', 'Medium', 'High', 'Critical'];

function initials(name = '') { return name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2); }

function Avatar({ name, size }) {
  return (
    <div className={`avatar ${size === 'lg' ? 'avatar-lg' : ''}`} style={{ background: 'var(--accent)' }}>
      {initials(name)}
    </div>
  );
}

function Badge({ value, type }) {
  const cls = `badge badge-${(type === 'status' ? value : value).replace(' ','-')}`;
  return <span className={cls}>{value}</span>;
}

/* ── Task Card ────────────────────────────────────────────────────────────── */
function TaskCard({ task, isAdmin, members, onUpdate, onDelete }) {
  const overdue = task.dueDate && task.status !== 'Done' && isPast(new Date(task.dueDate));

  const changeStatus = async (status) => {
    try {
      const r = await tasksAPI.update(task._id, { status });
      onUpdate(r.data.task);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '12px 14px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontWeight: 500, fontSize: 13, flex: 1 }}>{task.title}</div>
        <Badge value={task.priority} type="priority" />
      </div>

      {task.description && (
        <p style={{ color: 'var(--muted)', fontSize: 12, margin: '6px 0', lineHeight: 1.5 }}>{task.description}</p>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
        {/* Status selector */}
        <select
          value={task.status}
          onChange={e => changeStatus(e.target.value)}
          style={{ fontSize: 11, padding: '2px 6px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4 }}
        >
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>

        {task.assignee && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
            <div className="avatar" style={{ width: 18, height: 18, fontSize: 8 }}>{initials(task.assignee.name)}</div>
            {task.assignee.name}
          </div>
        )}

        {task.dueDate && (
          <span style={{ fontSize: 11, color: overdue ? 'var(--red)' : 'var(--muted)' }}>
            {overdue ? '⚠ ' : ''}Due {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>

      {isAdmin && (
        <button className="btn btn-danger btn-sm" style={{ marginTop: 10, fontSize: 11 }} onClick={() => onDelete(task._id)}>
          Delete
        </button>
      )}
    </div>
  );
}

/* ── Create/Edit Task Modal ───────────────────────────────────────────────── */
function TaskModal({ projectId, members, onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', assigneeId: '', dueDate: '' });
  const [busy, setBusy] = useState(false);
  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await tasksAPI.create({ ...form, projectId });
      onCreate(r.data.task);
      toast.success('Task created!');
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Task</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" name="title" placeholder="What needs to be done?" value={form.title} onChange={set} required minLength={2} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" name="description" placeholder="Details…" value={form.description} onChange={set} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input" name="priority" value={form.priority} onChange={set}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign to</label>
              <select className="form-input" name="assigneeId" value={form.assigneeId} onChange={set}>
                <option value="">— unassigned —</option>
                {members.map(m => <option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" name="dueDate" value={form.dueDate} onChange={set} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Add Member Modal ─────────────────────────────────────────────────────── */
function AddMemberModal({ projectId, onClose, onAdd }) {
  const [email, setEmail] = useState('');
  const [role,  setRole]  = useState('Member');
  const [busy,  setBusy]  = useState(false);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await projectsAPI.addMember(projectId, { email, role });
      onAdd(r.data.project);
      toast.success('Member added!');
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'User not found'); }
    finally { setBusy(false); }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Add Team Member</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
          The person must already have a TaskFlow account.
        </p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" placeholder="colleague@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
              <option>Member</option>
              <option>Admin</option>
            </select>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            <strong style={{ color: 'var(--accent2)' }}>Admin</strong> — full access: edit project, manage members, delete tasks.<br />
            <strong style={{ color: 'var(--accent)' }}>Member</strong> — can create tasks and update status only.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add Member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function ProjectDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project,    setProject]    = useState(null);
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showTask,   setShowTask]   = useState(false);
  const [showMember, setShowMember] = useState(false);
  const [activeTab,  setActiveTab]  = useState('board');  // 'board' | 'members'

  const load = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        projectsAPI.get(id),
        tasksAPI.list({ projectId: id }),
      ]);
      setProject(pRes.data.project);
      setTasks(tRes.data.tasks);
    } catch {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = project?.userRole === 'Admin';

  // ── Handlers ──
  const handleTaskUpdate = updated => setTasks(ts => ts.map(t => t._id === updated._id ? updated : t));
  const handleTaskDelete = async taskId => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksAPI.remove(taskId);
      setTasks(ts => ts.filter(t => t._id !== taskId));
      toast.success('Task deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const handleRemoveMember = async uid => {
    if (!window.confirm('Remove this member?')) return;
    try {
      const r = await projectsAPI.removeMember(id, uid);
      setProject(p => ({ ...p, members: r.data.project.members }));
      toast.success('Member removed');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const handleRoleChange = async (uid, role) => {
    try {
      const r = await projectsAPI.changeRole(id, uid, role);
      setProject(p => ({ ...p, members: r.data.project.members }));
      toast.success('Role updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading || !project) return <div className="page-loader"><div className="spinner" /></div>;

  // Group tasks by status for Kanban
  const columns = STATUSES.map(s => ({
    status: s,
    tasks:  tasks.filter(t => t.status === s),
  }));

  return (
    <div style={{ padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{ width: 6, height: 48, background: project.color, borderRadius: 3, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{project.name}</h1>
            <Badge value={project.status} type="status" />
            <Badge value={project.priority} type="priority" />
            <span className={`badge badge-${project.userRole}`}>{project.userRole}</span>
          </div>
          {project.description && (
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{project.description}</p>
          )}
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowTask(true)}>+ Task</button>
        )}
        {!isAdmin && (
          <button className="btn btn-secondary btn-sm" onClick={() => setShowTask(true)}>+ Task</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['board', 'members'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', background: 'transparent', border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--muted)',
              fontWeight: activeTab === tab ? 600 : 400, cursor: 'pointer', fontSize: 13,
              textTransform: 'capitalize',
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Kanban Board ── */}
      {activeTab === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 14 }}>
          {columns.map(col => (
            <div key={col.status} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, minHeight: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Badge value={col.status} type="status" />
                <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--border)', borderRadius: 10, padding: '1px 7px' }}>
                  {col.tasks.length}
                </span>
              </div>
              {col.tasks.map(task => (
                <TaskCard
                  key={task._id} task={task}
                  isAdmin={isAdmin}
                  members={project.members}
                  onUpdate={handleTaskUpdate}
                  onDelete={handleTaskDelete}
                />
              ))}
              {col.tasks.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Empty</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Members Panel ── */}
      {activeTab === 'members' && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>{project.members.length} Members</h2>
            {isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowMember(true)}>+ Invite</button>
            )}
          </div>

          {project.members.map(m => {
            const isOwner = project.owner?._id === m.user._id || project.owner === m.user._id;
            const isMe    = m.user._id === user?._id;
            return (
              <div key={m.user._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '12px 16px' }}>
                <Avatar name={m.user.name} size="lg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.user.name} {isMe && <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>(you)</span>}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>{m.user.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isAdmin && !isOwner ? (
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.user._id, e.target.value)}
                      style={{ fontSize: 12, padding: '3px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4 }}
                    >
                      <option>Admin</option>
                      <option>Member</option>
                    </select>
                  ) : (
                    <span className={`badge badge-${m.role}`}>{m.role}</span>
                  )}
                  {isOwner && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Owner</span>}
                  {isAdmin && !isOwner && !isMe && (
                    <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }} onClick={() => handleRemoveMember(m.user._id)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showTask && (
        <TaskModal
          projectId={id}
          members={project.members}
          onClose={() => setShowTask(false)}
          onCreate={t => setTasks(ts => [t, ...ts])}
        />
      )}
      {showMember && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowMember(false)}
          onAdd={updated => setProject(p => ({ ...p, members: updated.members }))}
        />
      )}
    </div>
  );
}