import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';

// If you already have apiFetch that adds the X-CSRF-Token header, use it.
// Otherwise replace with your fetch wrapper.
import { apiFetch } from '../csrfClient';

function strongPasswordOK(pwd) {
  // Same policy we enforced on the backend (≥12, upper, lower, digit, special)
  return (
    typeof pwd === 'string' &&
    pwd.length >= 12 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /\d/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd)
  );
}

export default function ChangePasswordDialog({ open, onClose, onChanged }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const newPwdHint = useMemo(() => {
    if (!newPassword) return '';
    if (!strongPasswordOK(newPassword)) {
      return 'Must be ≥12 chars and include upper, lower, number, and special.';
    }
    return '';
  }, [newPassword]);

  const canSubmit =
    oldPassword &&
    newPassword &&
    confirm &&
    newPassword === confirm &&
    strongPasswordOK(newPassword) &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const userData = JSON.parse(sessionStorage.getItem('user')).user;
    try {
      await apiFetch('/auth/must-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword, userId: userData.id }),
      });
      // success: notify parent to refetch session & close
      onChanged?.();
    } catch (err) {
      setError(err?.message || 'Password change failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => {}} maxWidth="xs" fullWidth>
      <DialogTitle>Change your password</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            label="Current password"
            type="password"
            fullWidth
            margin="dense"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoFocus
            required
          />
          <TextField
            label="New password"
            type="password"
            fullWidth
            margin="dense"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText={newPwdHint}
            error={Boolean(newPwdHint)}
            required
          />
          <TextField
            label="Confirm new password"
            type="password"
            fullWidth
            margin="dense"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={Boolean(confirm) && confirm !== newPassword}
            helperText={
              Boolean(confirm) && confirm !== newPassword ? 'Passwords do not match' : ' '
            }
            required
          />
          <DialogActions sx={{ px: 0, pb: 0, mt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!canSubmit}
              startIcon={submitting ? <CircularProgress size={18} /> : null}
            >
              {submitting ? 'Saving...' : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
