import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { projectsAPI } from '../api';
import { format } from 'date-fns';

const COLORS = ['#818cf8','#c084fc','#4ade80','#fbbf24','#fb923c','#f87171','#2dd4bf','#38bdf8'];

function ProjectCard({ project, onDelete }) {
  const { taskCounts = {} } = project;
  const done  = taskCounts.Done  || 0;
  const total = taskCounts.total || 0;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="card" style={{ borderTop: `3px solid ${project.color}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Link to={`/projects/${project._id}`} style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
          {project.name}
        </Link>
        <span className={`badge badge-${project.priority}`}>{project.priority}</span>
      </div>

      {project.description && (
        <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }}>{project.description}</p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className={`badge badge-${project.status.replace(' ','-')}`}>{project.status}</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{project.members.length} members</span>
        {project.deadline && (
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>Due {format(new Date(project.deadline), 'MMM d, yyyy')}</span>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
          <span>{done}/{total} tasks done</span><span>{pct}%</span>
        </div>
        <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: project.color, borderRadius: 3, transition: 'width .3s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Link to={`/projects/${project._id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          Open
        </Link>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(project._id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', priority: 'Medium', status: 'Active', deadline: '', color: COLORS[0] });
  const [busy, setBusy] = useState(false);
  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await projectsAPI.create(form);
      onCreate(r.data.project);
      toast.success('Project created!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Project</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" name="name" placeholder="My Awesome Project" value={form.name} onChange={set} required minLength={2} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" name="description" placeholder="What is this project about?" value={form.description} onChange={set} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" name="status" value={form.status} onChange={set}>
                {['Planning','Active','On Hold','Completed'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input" name="priority" value={form.priority} onChange={set}>
                {['Low','Medium','High','Critical'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Deadline</label>
            <input className="form-input" type="date" name="deadline" value={form.deadline} onChange={set} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: form.color === c ? '3px solid white' : '3px solid transparent' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    projectsAPI.list()
      .then(r => setProjects(r.data.projects))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async id => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await projectsAPI.remove(id);
      setProjects(p => p.filter(x => x._id !== id));
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Projects</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ marginBottom: 16 }}>No projects yet.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create your first project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
          {projects.map(p => (
            <ProjectCard key={p._id} project={p} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onCreate={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </div>
  );
}