import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

export default function GithubTokenModal({ isOpen, onClose, onSuccess }) {
  const { getToken } = useAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMsg('Token cannot be empty');
      setStatus('error');
      return;
    }
    if (!tokenInput.trim().startsWith('github_pat_') && !tokenInput.trim().startsWith('ghp_')) {
      setErrorMsg('Invalid token format. A valid token starts with "github_pat_" or "ghp_". Make sure you did not paste a URL.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const clerkToken = await getToken();
      const response = await fetch('http://localhost:5000/api/github-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({ githubToken: tokenInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save token');
      }

      setStatus('idle');
      setTokenInput('');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="card" style={{ width: '480px', padding: '32px', position: 'relative', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: 'var(--text-muted)' }}
        >
          &times;
        </button>
        
        <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', color: 'var(--text-primary)', fontWeight: '700' }}>Connect GitHub</h2>
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          Provide a GitHub Fine-Grained Personal Access Token (PAT) to allow UX Auditor to securely create branches and open Pull Requests.
        </p>
        
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
            How to generate your token:
          </div>
          <ol style={{ margin: 0, paddingLeft: '24px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
            <li style={{ marginBottom: '8px' }}>
              <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>Click here to open GitHub &rarr;</a>
            </li>
            <li style={{ marginBottom: '8px' }}>Set a <strong>Token name</strong> and <strong>Expiration</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Under <strong>Repository access</strong>, select the repos you want to audit.</li>
            <li style={{ marginBottom: '8px' }}>Under <strong>Permissions</strong>, grant the following:
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', color: 'var(--text-muted)' }}>
                <li>Contents: <strong>Read and write</strong></li>
                <li>Pull requests: <strong>Read and write</strong></li>
                <li>Metadata: <strong>Read-only</strong></li>
              </ul>
            </li>
            <li>Click <strong>Generate token</strong> at the bottom and paste it below.</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Personal Access Token
            </label>
            <input 
              type="password"
              placeholder="github_pat_..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)', background: '#0f172a',
                color: '#f8fafc', fontSize: '14px', fontFamily: 'monospace',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
              }}
            />
          </div>

          {status === 'error' && (
            <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={status === 'submitting'}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Connecting...' : 'Connect GitHub'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
