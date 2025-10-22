import React, { useState, useEffect } from "react";
import {
  Box, Typography, Tabs, Tab, Button, Table, TableHead, TableRow, TableCell,
  TableBody, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions,
  Snackbar, Alert, IconButton, Tooltip, Switch
} from "@mui/material";
import { Add, Delete, RestartAlt, ContentCopy as ContentCopyIcon } from "@mui/icons-material";
import Navbar from "@/components/navbar";
import { apiFetch } from "../../csrfClient";
import "../../styles/data_manager.css";

export default function ManageAccessPage() {
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", org_id: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [selectedItem, setSelectedItem] = useState("Manage Access");

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    onConfirm: null,
  });

  const showMessage = (msg, sev = "info") =>
    setSnackbar({ open: true, message: msg, severity: sev });

  const extractDataArray = (res) =>
    Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];

  // ---------- Fetch Organizations ----------
  const fetchOrgs = async () => {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/admin/orgs`);
      const arr = extractDataArray(res);
      setOrgs(arr);

      // Auto-select first org and load users
      if (arr.length > 0 && !selectedOrg) {
        setSelectedOrg(arr[0].id);
        fetchUsers(arr[0].id);
      }
    } catch (err) {
      console.error("Error fetching orgs:", err);
      showMessage("Failed to fetch organizations", "error");
    }
  };

  // ---------- Fetch Users ----------
  const fetchUsers = async (orgId) => {
    if (!orgId) return setUsers([]);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/admin/users/${orgId}`);
      setUsers(extractDataArray(res));
    } catch (err) {
      console.error("Error fetching users:", err);
      showMessage("Failed to fetch users", "error");
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  // Small helper to JSON POST with correct header
  const jsonPost = (url, payload) =>
    apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  // ---------- Add (User / Organization) ----------
  const handleAdd = async () => {
    try {
      if (tab === 0) {
        // Add user
        if (!form.email || !form.org_id) {
          showMessage("Email and Organization are required.", "warning");
          return;
        }
        const res = await jsonPost(
          `${import.meta.env.VITE_API_URL}/admin/users/create`,
          { email: form.email.trim(), orgId: form.org_id, isAdmin: false }
        );

        if (res.ok) {
          showMessage("User added successfully", "success");
          fetchUsers(form.org_id);
          setOpenAdd(false);
          setForm({ name: "", email: "", org_id: "" });
        } else {
          showMessage(res.data?.error || "Failed to add user", "error");
        }
      } else {
        // Add organization
        if (!form.name) {
          showMessage("Organization name is required.", "warning");
          return;
        }
        const res = await jsonPost(
          `${import.meta.env.VITE_API_URL}/admin/orgs/create`,
          { name: form.name.trim() }
        );

        if (res.ok) {
          showMessage("Organization added successfully", "success");
          setOpenAdd(false);
          setForm({ name: "", email: "", org_id: "" });
          fetchOrgs();
        } else {
          showMessage(res.data?.error || "Failed to add organization", "error");
        }
      }
    } catch (err) {
      console.error("Add failed:", err);
      showMessage("Error adding entry", "error");
    }
  };

  // ---------- Reset Password ----------
  const handleResetPassword = async (id) => {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/admin/users/reset/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok)
        showMessage(`Password reset. Temp password: ${res.data?.tempPassword}`, "info");
      else showMessage(res.data?.error || "Failed to reset user", "error");
    } catch (err) {
      showMessage("Error resetting password", "error");
    }
  };

  // ---------- Toggle Org Active ----------
  const handleToggleActive = async (org) => {
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL}/admin/orgs/toggle/${org.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" } }
      );
      if (res.ok) {
        showMessage(`${org.name} ${org.active ? "deactivated" : "activated"}`, "success");
        fetchOrgs();
      } else showMessage(res.data?.error || "Failed to toggle", "error");
    } catch (err) {
      showMessage("Error toggling org", "error");
    }
  };

  // ---------- Delete Org ----------
  const handleDeleteOrg = async (id) => {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/admin/orgs/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        showMessage("Organization deleted", "success");
        fetchOrgs();
      } else showMessage(res.data?.error || "Failed to delete organization", "error");
    } catch (err) {
      showMessage("Error deleting organization", "error");
    }
  };

  // ---------- Delete User ----------
  const handleDeleteUser = async (id) => {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/admin/users/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        showMessage("User deleted", "success");
        fetchUsers(selectedOrg);
      } else showMessage(res.data?.error || "Failed to delete user", "error");
    } catch (err) {
      showMessage("Error deleting user", "error");
    }
  };

  const openConfirmDialog = (title, onConfirm) =>
    setConfirmDialog({ open: true, title, onConfirm });

  const closeConfirmDialog = () =>
    setConfirmDialog({ open: false, title: "", onConfirm: null });

  return (
    <Box className="dashboard-container file-upload-container">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />

      <Box className="dashboard-content main-content">
        <Typography variant="h4" sx={{ mb: 2 }}>Manage Access</Typography>
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Users" />
            <Tab label="Organizations" />
          </Tabs>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenAdd(true)}
              sx={{ mb: 2 }}
            >
              Add {tab === 0 ? "User" : "Organization"}
            </Button>

            {tab === 0 && (
              <TextField
                select
                label="Select Organization"
                SelectProps={{ native: true }}
                sx={{ mb: 2, ml: 2, width: "250px" }}
                value={selectedOrg}
                onChange={(e) => {
                  setSelectedOrg(e.target.value);
                  fetchUsers(e.target.value);
                }}
              >
                <option value="">-</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </TextField>
            )}

            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
                  {tab === 0 ? (
                    <>
                      <TableCell>Email</TableCell>
                      <TableCell>Org ID</TableCell>
                      <TableCell>Created At</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>Name</TableCell>
                      <TableCell>ID</TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {(tab === 0 ? users : orgs).map((item) => (
                  <TableRow key={item.id}>
                    {tab === 0 ? (
                      <>
                        <TableCell>{item.email}</TableCell>
                        <TableCell>{item.org_id}</TableCell>
                        <TableCell>{item.created_at}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Reset Password">
                            <IconButton color="warning" onClick={() => handleResetPassword(item.id)}>
                              <RestartAlt />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton
                              color="error"
                              onClick={() =>
                                openConfirmDialog("Delete this user?", () => handleDeleteUser(item.id))
                              }
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>
                          <Switch
                            checked={!!item.active}
                            onChange={() => handleToggleActive(item)}
                            color="success"
                            disabled={item.id === 1}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Delete Organization">
                            <IconButton
                              color="error"
                              onClick={() =>
                                openConfirmDialog("Delete this organization?", () =>
                                  handleDeleteOrg(item.id)
                                )
                              }
                              disabled={item.id === 1}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Box>

      {/* Add Dialog */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)}>
        <DialogTitle>Add {tab === 0 ? "User" : "Organization"}</DialogTitle>
        <DialogContent>
          {tab === 0 ? (
            <>
              <TextField
                fullWidth
                label="Email"
                margin="dense"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <TextField
                select
                fullWidth
                label="Organization"
                margin="dense"
                value={form.org_id}
                onChange={(e) => setForm({ ...form, org_id: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value=""></option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </TextField>
            </>
          ) : (
            <TextField
              fullWidth
              label="Organization Name"
              margin="dense"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog}>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>{confirmDialog.title}</DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              confirmDialog.onConfirm?.();
              closeConfirmDialog();
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          sx={{ width: "100%", display: "flex", alignItems: "center" }}
          action={
            <Tooltip title="Copy">
              <IconButton
                onClick={() => navigator.clipboard.writeText(snackbar.message)}
                size="small"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
