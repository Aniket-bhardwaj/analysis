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
    <Dialog
  className="change-password-dialog"
  open={open}
  onClose={() => {}}
  maxWidth="xs"
  fullWidth
  PaperProps={{
    sx: {
      p: 2.5,
      borderRadius: 3,
      boxShadow: 4,
      fontFamily: 'Poppins, sans-serif',
      fontSize: '0.9rem',
    },
  }}
>
  <DialogTitle
    sx={{
      textAlign: 'center',
      fontWeight: 600,
      fontSize: '1.2rem',
      color: 'primary.main',
      mb: 1,
    }}
  >
    Change Your Password
  </DialogTitle>

  <DialogContent sx={{ pt: 1 }}>
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: 2,
            fontSize: '0.8rem',
          }}
        >
          {error}
        </Alert>
      )}

      <TextField
        label="Current Password"
        type="password"
        fullWidth
        margin="dense"
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
        autoFocus
        required
        sx={{
          '& .MuiInputBase-root': { borderRadius: 2 },
          '& .MuiFormLabel-root': { fontSize: '0.85rem' },
        }}
      />

      <TextField
        label="New Password"
        type="password"
        fullWidth
        margin="dense"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        helperText={newPwdHint}
        error={Boolean(newPwdHint)}
        required
        sx={{
          mt: 1,
          '& .MuiInputBase-root': { borderRadius: 2 },
          '& .MuiFormLabel-root': { fontSize: '0.85rem' },
        }}
      />

      <TextField
        label="Confirm New Password"
        type="password"
        fullWidth
        margin="dense"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={Boolean(confirm) && confirm !== newPassword}
        helperText={
          Boolean(confirm) && confirm !== newPassword
            ? 'Passwords do not match'
            : ' '
        }
        required
        sx={{
          mt: 1,
          '& .MuiInputBase-root': { borderRadius: 2 },
          '& .MuiFormLabel-root': { fontSize: '0.85rem' },
        }}
      />

      <DialogActions
        sx={{
          px: 0,
          pb: 0,
          mt: 2,
          justifyContent: 'center',
        }}
      >
        <Button
          type="submit"
          variant="contained"
          disabled={!canSubmit}
          startIcon={submitting ? <CircularProgress size={18} /> : null}
          sx={{
            borderRadius: 3,
            px: 3,
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {submitting ? 'Saving...' : 'Change Password'}
        </Button>
      </DialogActions>
    </form>
  </DialogContent>
</Dialog>
  );
}
