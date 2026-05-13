import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksAPI } from '../api';
import { format, isPast } from 'date-fns';

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function TaskRow({ task }) {
  const overdue = task.dueDate && task.status !== 'Done' && isPast(new Date(task.dueDate));
  const statusClass = `badge badge-${task.status.replace(' ', '-')}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }} className="truncate">{task.title}</div>
        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
          {task.project?.name}
          {task.dueDate && (
            <span className={overdue ? 'overdue' : ''} style={{ marginLeft: 8 }}>
              {overdue ? '⚠ Overdue · ' : ''}Due {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
        </div>
      </div>
      <span className={statusClass}>{task.status}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksAPI.stats()
      .then(r => setStats(r.data.stats))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const s = stats;
  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatCard label="Projects"    value={s.totalProjects}          color="var(--accent)" />
        <StatCard label="Total Tasks" value={s.totalTasks}             />
        <StatCard label="In Progress" value={s.byStatus['In Progress']} color="var(--accent)" />
        <StatCard label="Done"        value={s.byStatus['Done']}        color="var(--green)" />
        <StatCard label="Overdue"     value={s.overdueCount}            color={s.overdueCount ? 'var(--red)' : undefined} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: 20 }}>

        {/* My tasks */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>My Open Tasks</h2>
          {s.myTasks.length === 0
            ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No tasks assigned to you.</p>
            : s.myTasks.map(t => <TaskRow key={t._id} task={t} />)
          }
        </div>

        {/* Overdue */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: s.overdueCount ? 'var(--red)' : 'var(--text)' }}>
            ⚠ Overdue Tasks
          </h2>
          {s.overdueTasks.length === 0
            ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No overdue tasks 🎉</p>
            : s.overdueTasks.map(t => <TaskRow key={t._id} task={t} />)
          }
        </div>

        {/* Recent */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Recently Created</h2>
          {s.recentTasks.length === 0
            ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No tasks yet.</p>
            : s.recentTasks.map(t => <TaskRow key={t._id} task={t} />)
          }
          <Link to="/projects" style={{ display: 'inline-block', marginTop: 14, color: 'var(--accent)', fontSize: 13 }}>
            View all projects →
          </Link>
        </div>

      </div>
    </div>
  );
}