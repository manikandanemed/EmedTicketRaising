import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  api, 
  ProjectDto, 
  WorkItemDto, 
  EmployeeDropdownDto,
  SoftwareBuildDto,
  ClientDto,
  ProductDto,
  ModuleDto,
  API_BASE_URL
} from '../services/api';
import { useAuth } from '../App';
import { toast } from '../services/toast';
import { useDebounce } from '../hooks/useDebounce';
import { 
  Briefcase, 
  Plus, 
  ChevronRight, 
  User, 
  Search,
  Calendar,
  AlertCircle,
  X,
  PlusCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Download,
  Upload,
  Trash2,
  Kanban,
  LayoutGrid,
  Zap,
  Bug,
  CheckSquare,
  Edit
} from 'lucide-react';

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPM = user?.userType === 'ProductManager';

  // State for project list
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectDto[]>([]);
  const [projectsTotalCount, setProjectsTotalCount] = useState(0);
  const [projectsTotalPages, setProjectsTotalPages] = useState(1);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fixed Build Modal State
  const [showFixedBuildModal, setShowFixedBuildModal] = useState(false);
  const [pendingStatusItemId, setPendingStatusItemId] = useState<number | null>(null);
  const [pendingStatusValue, setPendingStatusValue] = useState('');
  const [selectedFixedBuild, setSelectedFixedBuild] = useState('');
  const [customFixedBuild, setCustomFixedBuild] = useState('');
  const [modalBuildOptions, setModalBuildOptions] = useState<{ buildNumber: string }[]>([]);

  // JIRA import state
  const [showImportJira, setShowImportJira] = useState(false);
  const [jiraCsvFile, setJiraCsvFile] = useState<File | null>(null);
  const [importingJira, setImportingJira] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    projectsImported: number;
    usersImported: number;
    workItemsImported: number;
    bugsImported: number;
    warnings: string[];
    errors: string[];
  } | null>(null);

  // Selected project details
  const [selectedProject, setSelectedProject] = useState<(ProjectDto & { workItems: WorkItemDto[] }) | null>(null);
  const [workItems, setWorkItems] = useState<WorkItemDto[]>([]);
  const [workItemsTotalCount, setWorkItemsTotalCount] = useState(0);
  const [workItemsTotalPages, setWorkItemsTotalPages] = useState(1);
  const [workItemsLoading, setWorkItemsLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [workItemSearchQuery, setWorkItemSearchQuery] = useState('');
  const [workItemStatusFilters, setWorkItemStatusFilters] = useState<string[]>([]);
  const [workItemStatusDropdownOpen, setWorkItemStatusDropdownOpen] = useState(false);
  const [workItemAssigneeFilter, setWorkItemAssigneeFilter] = useState('all');
  const [workItemDateFilter, setWorkItemDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');

  const KANBAN_COLUMNS = [
    { id: 'pending', title: 'TO DO', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.04)', border: 'rgba(148, 163, 184, 0.15)' },
    { id: 'assigned', title: 'ASSIGNED', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.04)', border: 'rgba(148, 163, 184, 0.15)' },
    { id: 'reopened', title: 'REOPEN', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.04)', border: 'rgba(148, 163, 184, 0.15)' },
    { id: 'in_progress', title: 'IN PROGRESS', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.04)', border: 'rgba(56, 189, 248, 0.15)' },
    { id: 'future_release', title: 'MOVED TO FUTURE RELEASE', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.04)', border: 'rgba(56, 189, 248, 0.15)' },
    { id: 'completed', title: 'RESOLVED', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.04)', border: 'rgba(74, 222, 128, 0.15)' }
  ];

  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    e.dataTransfer.setData('text/plain', itemId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const itemIdStr = e.dataTransfer.getData('text/plain');
    if (!itemIdStr) return;
    const itemId = Number(itemIdStr);

    if (!selectedProject) return;

    const item = workItems.find(w => w.id === itemId);
    if (!item || item.status === newStatus) return;

    if (newStatus === 'fixed' || newStatus === 'completed') {
      setPendingStatusItemId(itemId);
      setPendingStatusValue(newStatus);
      setSelectedFixedBuild('');
      setModalBuildOptions([]);
      
      // Update local state optimistically so dropdown changes visually
      setWorkItems(prev => prev.map(w => w.id === itemId ? { ...w, status: newStatus as any } : w));

      // Load builds dynamically
      try {
        const buildsRes = await api.getBuildsByProject(item.projectId);
        if (buildsRes.success) {
          setModalBuildOptions(buildsRes.data);
          if (buildsRes.data.length > 0) {
            setSelectedFixedBuild(buildsRes.data[0].buildNumber);
          }
        }
      } catch (_) {}
      
      setShowFixedBuildModal(true);
      return;
    }

    // Optimistic Update: Update UI instantly
    const updatedWorkItems = workItems.map(w => 
      w.id === itemId ? { ...w, status: newStatus as any } : w
    );
    setWorkItems(updatedWorkItems);

    try {
      const res = await api.updateWorkItemStatus(itemId, {
        status: newStatus
      });
      if (res.success) {
        toast.success('Task status updated!');
      } else {
        toast.error(res.message || 'Failed to update task status');
        fetchWorkItems(selectedProject.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating task status');
      fetchWorkItems(selectedProject.id);
    }
  };

  const handleUpdateTaskStatusInProject = async (itemId: number, newStatus: string) => {
    if (!selectedProject) return;

    const item = workItems.find(w => w.id === itemId);
    if (!item || item.status === newStatus) return;

    if (newStatus === 'fixed' || newStatus === 'completed') {
      setPendingStatusItemId(itemId);
      setPendingStatusValue(newStatus);
      setSelectedFixedBuild('');
      setModalBuildOptions([]);
      
      // Update local state optimistically so dropdown changes visually
      setWorkItems(prev => prev.map(w => w.id === itemId ? { ...w, status: newStatus as any } : w));

      // Load builds dynamically
      try {
        const buildsRes = await api.getBuildsByProject(item.projectId);
        if (buildsRes.success) {
          setModalBuildOptions(buildsRes.data);
          if (buildsRes.data.length > 0) {
            setSelectedFixedBuild(buildsRes.data[0].buildNumber);
          }
        }
      } catch (_) {}
      
      setShowFixedBuildModal(true);
      return;
    }

    // Optimistic Update: Update UI instantly
    const updatedWorkItems = workItems.map(w => 
      w.id === itemId ? { ...w, status: newStatus as any } : w
    );
    setWorkItems(updatedWorkItems);

    try {
      const res = await api.updateWorkItemStatus(itemId, {
        status: newStatus
      });
      if (res.success) {
        toast.success('Task status updated!');
      } else {
        toast.error(res.message || 'Failed to update task status');
        fetchWorkItems(selectedProject.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating task status');
      fetchWorkItems(selectedProject.id);
    }
  };

  const handleInlineDueDateChange = async (itemId: number, newDate: string) => {
    if (!selectedProject) return;
    const updatedWorkItems = workItems.map(w =>
      w.id === itemId ? { ...w, dueDate: newDate || null } as any : w
    );
    setWorkItems(updatedWorkItems);

    try {
      const res = await api.updateWorkItemDueDate(itemId, newDate || null);
      if (res.success) {
        toast.success('Due date updated!');
      } else {
        toast.error(res.message || 'Failed to update due date');
        fetchWorkItems(selectedProject.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating due date');
      fetchWorkItems(selectedProject.id);
    }
  };

  const handleInlineAssigneeChange = async (itemId: number, newAssigneeId: number | '') => {
    if (!selectedProject) return;
    const assignedEmployee = employees.find(e => e.id === newAssigneeId);
    const updatedWorkItems = workItems.map(w =>
      w.id === itemId
        ? { ...w, assignedToUserId: newAssigneeId === '' ? null : newAssigneeId, assignedTo: newAssigneeId === '' ? null : (assignedEmployee?.name || w.assignedTo) } as any
        : w
    );
    setWorkItems(updatedWorkItems);

    try {
      const res = await api.reassignWorkItem(itemId, newAssigneeId === '' ? null : Number(newAssigneeId));
      if (res.success) {
        toast.success('Task reassigned!');
        fetchWorkItems(selectedProject.id);
      } else {
        toast.error(res.message || 'Failed to reassign task');
        fetchWorkItems(selectedProject.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error reassigning task');
      fetchWorkItems(selectedProject.id);
    }
  };

  const handleConfirmFixedBuild = async () => {
    if (!selectedProject || !pendingStatusItemId || !pendingStatusValue) return;
    const itemId = pendingStatusItemId;
    const newStatus = pendingStatusValue;
    // Custom typed value takes priority over dropdown selection
    const fixedBuildVal = (customFixedBuild.trim() || selectedFixedBuild.trim()) || undefined;

    setShowFixedBuildModal(false);

    // Optimistic Update: Update UI instantly including fixedBuild
    const updatedWorkItems = workItems.map(w =>
      w.id === itemId ? { ...w, status: newStatus as any, fixedBuild: fixedBuildVal || w.fixedBuild } : w
    );
    setWorkItems(updatedWorkItems);

    try {
      const res = await api.updateWorkItemStatus(itemId, {
        status: newStatus,
        fixedBuild: fixedBuildVal
      });
      if (res.success) {
        toast.success('Task status updated!');
        // Refresh to get accurate data from server
        fetchWorkItems(selectedProject.id);
      } else {
        toast.error(res.message || 'Failed to update task status');
        fetchWorkItems(selectedProject.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating task status');
      fetchWorkItems(selectedProject.id);
    } finally {
      setPendingStatusItemId(null);
      setPendingStatusValue('');
      setSelectedFixedBuild('');
      setCustomFixedBuild('');
      setModalBuildOptions([]);
    }
  };

  const handleCancelFixedBuild = () => {
    setShowFixedBuildModal(false);
    if (selectedProject) {
      fetchWorkItems(selectedProject.id);
    }
    setPendingStatusItemId(null);
    setPendingStatusValue('');
    setSelectedFixedBuild('');
    setCustomFixedBuild('');
    setModalBuildOptions([]);
  };

  // Pagination State
  const [projectPage, setProjectPage] = useState(() => {
    const saved = sessionStorage.getItem('projectPage');
    return saved ? Number(saved) : 1;
  });

  useEffect(() => {
    sessionStorage.setItem('projectPage', String(projectPage));
  }, [projectPage]);

  const [workItemPage, setWorkItemPage] = useState(1);
  const PROJECTS_PER_PAGE = 10;
  const WORK_ITEMS_PER_PAGE = 10;

  // Modals state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [showEditMembers, setShowEditMembers] = useState(false);
  const [updatingMembers, setUpdatingMembers] = useState(false);
  const [projectNameError, setProjectNameError] = useState('');

  // Unified Create Functional Requirement Modal states
  const [showCreateFunctional, setShowCreateFunctional] = useState(false);
  const [selectedProjectIdForCreation, setSelectedProjectIdForCreation] = useState<number | ''>('');
  const [createAnother, setCreateAnother] = useState(false);
  const [functionalWorkType, setFunctionalWorkType] = useState('Functional Requirements');
  const [functionalStatus, setFunctionalStatus] = useState('pending');
  const [projectSelectError, setProjectSelectError] = useState('');

  // JIRA fields states
  const [functionalStartDate, setFunctionalStartDate] = useState('');
  const [functionalDueDate, setFunctionalDueDate] = useState('');
  const [functionalParentId, setFunctionalParentId] = useState<number | ''>('');
  const [functionalLabel, setFunctionalLabel] = useState('');
  const [functionalTeam, setFunctionalTeam] = useState('');
  const [uploadedAttachmentUrls, setUploadedAttachmentUrls] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Client, Product, Module states
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [showHierarchyManager, setShowHierarchyManager] = useState(false);
  const [hierarchyTab, setHierarchyTab] = useState<'clients' | 'modules' | 'builds'>('clients');

  // Build states
  const [builds, setBuilds] = useState<SoftwareBuildDto[]>([]);
  const [selectedProjectIdForBuild, setSelectedProjectIdForBuild] = useState<number | ''>('');
  const [newBuildNumber, setNewBuildNumber] = useState('');
  const [creatingBuild, setCreatingBuild] = useState(false);

  const [newClientName, setNewClientName] = useState('');
  const [newClientDesc, setNewClientDesc] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [selectedProjectIdForProduct, setSelectedProjectIdForProduct] = useState<number | ''>('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [selectedProjectIdForModule, setSelectedProjectIdForModule] = useState<number | ''>('');
  const [selectedProductIdForModule, setSelectedProductIdForModule] = useState<number | ''>('');
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [creatingModule, setCreatingModule] = useState(false);

  // Inline edit state for Hierarchy Setup
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientDesc, setEditClientDesc] = useState('');

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductDesc, setEditProductDesc] = useState('');

  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [editModuleName, setEditModuleName] = useState('');
  const [editModuleDesc, setEditModuleDesc] = useState('');

  const [editingBuildId, setEditingBuildId] = useState<number | null>(null);
  const [editBuildNumber, setEditBuildNumber] = useState('');
  const [editBuildIsActive, setEditBuildIsActive] = useState<boolean>(true);

  // Dynamic products & modules list inside Create Functional Requirement Modal
  const [productsForCreation, setProductsForCreation] = useState<ProductDto[]>([]);
  const [selectedProductIdForCreation, setSelectedProductIdForCreation] = useState<number | ''>('');
  const [modulesForCreation, setModulesForCreation] = useState<ModuleDto[]>([]);
  const [selectedModuleIdForCreation, setSelectedModuleIdForCreation] = useState<number | ''>('');
  const [selectedClientIdForCreation, setSelectedClientIdForCreation] = useState<number | ''>('');
  const [buildsForCreation, setBuildsForCreation] = useState<SoftwareBuildDto[]>([]);
  const [raisedBuildForCreation, setRaisedBuildForCreation] = useState('');
  const [fixedBuildForCreation, setFixedBuildForCreation] = useState('');

  // Project Client creation selection
  const [selectedClientIdForProject, setSelectedClientIdForProject] = useState<number | ''>('');

  const [showCreateWorkItem, setShowCreateWorkItem] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkDesc, setNewWorkDesc] = useState('');
  const [newWorkPriority, setNewWorkPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newWorkAssignedId, setNewWorkAssignedId] = useState<number | ''>('');
  const [newWorkRaisedBuild, setNewWorkRaisedBuild] = useState('');
  const [newWorkFixedBuild, setNewWorkFixedBuild] = useState('');
  const [employees, setEmployees] = useState<EmployeeDropdownDto[]>([]);
  const [creatingWorkItem, setCreatingWorkItem] = useState(false);
  const [workTitleError, setWorkTitleError] = useState('');
  // Epic & Bug extra fields
  const [bugSeverity, setBugSeverity] = useState('3');
  const [bugIssueType, setBugIssueType] = useState('New');
  const [newEpicName, setNewEpicName] = useState('');
  const [newEpicColor, setNewEpicColor] = useState('purple');
  const [submissionType, setSubmissionType] = useState<'standard' | 'another' | 'copy'>('standard');

  const [confirmDeleteProject, setConfirmDeleteProject] = useState<ProjectDto | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  // Custom Confirm Modal (replaces window.confirm)
  const [customConfirm, setCustomConfirm] = useState<{ message: string; subtext?: string; onConfirm: () => void } | null>(null);
  const showConfirm = (message: string, subtext: string, onConfirm: () => void) => {
    setCustomConfirm({ message, subtext, onConfirm });
  };

  // Edit Project Details State
  const [showEditProject, setShowEditProject] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectDto | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editProjectStatus, setEditProjectStatus] = useState('active');
  const [editProjectClientId, setEditProjectClientId] = useState<number | ''>('');
  const [updatingProject, setUpdatingProject] = useState(false);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await api.getAllProjectsPaged({
        page: projectPage,
        pageSize: PROJECTS_PER_PAGE,
        search: searchQuery || undefined
      });
      if (res.success) {
        setProjects(res.data.items);
        setProjectsTotalCount(res.data.totalCount);
        setProjectsTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching projects');
    } finally {
      setProjectsLoading(false);
      setLoading(false);
    }
  };

  const fetchAllProjects = async () => {
    try {
      const res = await api.getAllProjects();
      if (res.success) {
        setAllProjects(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching all projects:', err);
    }
  };

  const fetchWorkItems = async (projectId: number) => {
    setWorkItemsLoading(true);
    try {
      const res = await api.getWorkItemsByProjectPaged(projectId, {
        page: workItemPage,
        pageSize: WORK_ITEMS_PER_PAGE,
        status: workItemStatusFilters.length > 0 ? workItemStatusFilters.join(',') : undefined,
        search: workItemSearchQuery || undefined,
        assignedTo: workItemAssigneeFilter !== 'all' ? workItemAssigneeFilter : undefined,
        dueDate: workItemDateFilter || undefined
      });
      if (res.success) {
        setWorkItems(res.data.items);
        setWorkItemsTotalCount(res.data.totalCount);
        setWorkItemsTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      console.error('Failed to fetch work items:', err);
    } finally {
      setWorkItemsLoading(false);
    }
  };

  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const safeStr = (val: any) => {
    if (val === null || val === undefined) return '';
    return String(val);
  };

  // Builds CSV row objects for a flat list of work items belonging to one project.
  // Comments + bugs for every work item are fetched concurrently (not one-by-one)
  // so export speed doesn't degrade linearly with the number of items.
  const buildIssueRowsForWorkItems = async (items: WorkItemDto[], projectCode: string, projectName: string) => {
    const perItemRows = await Promise.all(items.map(async (w) => {
      const rows: any[] = [];

      const [cmtRes, bugRes] = await Promise.all([
        api.getCommentsByWorkItem(w.id).catch(() => null),
        api.getBugsByWorkItem(w.id).catch(() => null)
      ]);

      let commentsText = '';
      if (cmtRes && cmtRes.success && cmtRes.data.length > 0) {
        commentsText = cmtRes.data
          .map(c => `${c.postedBy} [${new Date(c.createdAt).toLocaleDateString()}]: ${c.message}`)
          .join(' | ');
      }

      if (w.workType !== 'Bug') {
        rows.push({
          issueType: 'Task',
          projectCode,
          projectName,
          issueNumber: w.workNumber,
          title: w.title,
          description: w.description || '',
          status: w.status,
          priority: w.priority,
          assignedTo: w.assignedTo || 'Unassigned',
          raisedBy: w.createdBy,
          createdAt: new Date(w.createdAt).toLocaleDateString(),
          dueDate: w.dueDate ? new Date(w.dueDate).toLocaleDateString() : '',
          fixedAt: '',
          closedAt: '',
          parentIssue: '',
          comments: commentsText
        });
      }

      if (bugRes && bugRes.success && bugRes.data.length > 0) {
        bugRes.data.forEach(b => {
          rows.push({
            issueType: 'Bug',
            projectCode,
            projectName,
            issueNumber: b.bugNumber,
            title: b.title,
            description: b.description || '',
            status: b.status,
            priority: '',
            assignedTo: b.assignedTo || 'Unassigned',
            raisedBy: b.raisedBy,
            createdAt: new Date(b.createdAt).toLocaleDateString(),
            dueDate: '',
            fixedAt: b.fixedAt ? new Date(b.fixedAt).toLocaleDateString() : '',
            closedAt: b.closedAt ? new Date(b.closedAt).toLocaleDateString() : '',
            parentIssue: w.workNumber,
            comments: ''
          });
        });
      }

      return rows;
    }));

    return perItemRows.flat();
  };

  const rowsToCsvContent = (allRows: any[]) => {
    const headers = [
      'Issue Type', 'Project Code', 'Project Name', 'Issue Number', 'Title',
      'Description', 'Status', 'Priority', 'Assigned To', 'Raised By',
      'Created On', 'Due Date', 'Fixed On', 'Closed On', 'Parent Issue', 'Comments'
    ];
    const csvRows = [
      headers.join(','),
      ...allRows.map(r => [
        `"${safeStr(r.issueType)}"`,
        `"${safeStr(r.projectCode).replace(/"/g, '""')}"`,
        `"${safeStr(r.projectName).replace(/"/g, '""')}"`,
        `"${safeStr(r.issueNumber).replace(/"/g, '""')}"`,
        `"${safeStr(r.title).replace(/"/g, '""')}"`,
        `"${safeStr(r.description).replace(/"/g, '""')}"`,
        `"${safeStr(r.status).replace(/"/g, '""')}"`,
        `"${safeStr(r.priority)}"`,
        `"${safeStr(r.assignedTo).replace(/"/g, '""')}"`,
        `"${safeStr(r.raisedBy).replace(/"/g, '""')}"`,
        `"${safeStr(r.createdAt)}"`,
        `"${safeStr(r.dueDate)}"`,
        `"${safeStr(r.fixedAt)}"`,
        `"${safeStr(r.closedAt)}"`,
        `"${safeStr(r.parentIssue)}"`,
        `"${safeStr(r.comments).replace(/"/g, '""')}"`
      ].join(','))
    ];
    return '﻿' + csvRows.join('\n');
  };

  const handleExportAllCSV = async () => {
    try {
      const res = await api.getAllProjects();
      if (!res.success) {
        toast.error('Failed to fetch projects for export: ' + res.message);
        return;
      }

      // Build rows for every project's work items concurrently too — not just
      // within a project — since projects are independent of each other.
      const perProjectRows = await Promise.all(
        res.data.map(p =>
          p.workItems && Array.isArray(p.workItems)
            ? buildIssueRowsForWorkItems(p.workItems, p.projectNumber, p.name)
            : Promise.resolve([])
        )
      );
      const allRows = perProjectRows.flat();

      if (allRows.length === 0) {
        toast.info('No tasks found to export.');
        return;
      }

      downloadCSV('teamtrack_all_issues_export.csv', rowsToCsvContent(allRows));
    } catch (err: any) {
      toast.error('Failed to export CSV: ' + err.message);
    }
  };

  const handleJiraImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jiraCsvFile) {
      toast.error('Please select a JIRA CSV file.');
      return;
    }
    setImportingJira(true);
    setImportSummary(null);
    try {
      const res = await api.importJiraCsv(jiraCsvFile);
      if (res.success) {
        toast.success(res.message || 'JIRA issues imported successfully.');
        setImportSummary(res.data);
        // Refresh project list
        const projRes = await api.getAllProjects();
        if (projRes.success) {
          setProjects(projRes.data);
        }
      } else {
        toast.error('JIRA import failed: ' + res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during JIRA import.');
    } finally {
      setImportingJira(false);
    }
  };

  const handleExportProjectCSV = async () => {
    if (!selectedProject) return;

    try {
      const itemsRes = await api.getWorkItemsByProject(selectedProject.id);
      const itemsToExport = itemsRes.success ? itemsRes.data : [];

      if (itemsToExport.length === 0) {
        toast.info('No issues found to export for this project.');
        return;
      }

      const allRows = await buildIssueRowsForWorkItems(itemsToExport, selectedProject.projectNumber, selectedProject.name);

      if (allRows.length === 0) {
        toast.info('No issues found to export for this project.');
        return;
      }

      downloadCSV(`teamtrack_${selectedProject.projectNumber}_issues_export.csv`, rowsToCsvContent(allRows));
    } catch (err: any) {
      toast.error('Failed to export project CSV: ' + err.message);
    }
  };

  const fetchProjectDetails = async (id: number) => {
    setLoadingDetails(true);
    try {
      const res = await api.getProjectById(id);
      if (res.success) {
        setSelectedProject(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching project details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.getEmployeesDropdown();
      if (res.success) {
        setEmployees(res.data);
      }
    } catch (err) {}
  };

  const fetchClients = async () => {
    try {
      const res = await api.getClients();
      if (res.success) {
        setClients(res.data);
      }
    } catch (err) {}
  };

  const fetchProducts = async (projectId: number) => {
    try {
      const res = await api.getProducts(projectId);
      if (res.success) {
        setProducts(res.data);
      }
    } catch (err) {}
  };

  const fetchModules = async (productId: number) => {
    try {
      const res = await api.getModules(productId);
      if (res.success) {
        setModules(res.data);
      }
    } catch (err) {}
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    setCreatingClient(true);
    try {
      const res = await api.createClient(newClientName.trim(), newClientDesc || undefined);
      if (res.success) {
        toast.success('Client created successfully!');
        setNewClientName('');
        setNewClientDesc('');
        fetchClients();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating client');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectIdForProduct) {
      toast.error('Please select a project');
      return;
    }
    if (!newProductName.trim()) {
      toast.error('Product name is required');
      return;
    }
    setCreatingProduct(true);
    try {
      const res = await api.createProduct(
        newProductName.trim(),
        newProductDesc || undefined,
        Number(selectedProjectIdForProduct)
      );
      if (res.success) {
        toast.success('Product created successfully!');
        setNewProductName('');
        setNewProductDesc('');
        fetchProducts(Number(selectedProjectIdForProduct));
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating product');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductIdForModule) {
      toast.error('Please select a product');
      return;
    }
    if (!newModuleName.trim()) {
      toast.error('Module name is required');
      return;
    }
    setCreatingModule(true);
    try {
      const res = await api.createModule(
        newModuleName.trim(),
        newModuleDesc || undefined,
        Number(selectedProductIdForModule)
      );
      if (res.success) {
        toast.success('Module created successfully!');
        setNewModuleName('');
        setNewModuleDesc('');
        fetchModules(Number(selectedProductIdForModule));
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating module');
    } finally {
      setCreatingModule(false);
    }
  };

  const fetchBuilds = async (projectId: number) => {
    try {
      const res = await api.getBuildsByProject(projectId);
      if (res.success) setBuilds(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load builds');
    }
  };

  const handleCreateBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectIdForBuild) {
      toast.error('Please select a project');
      return;
    }
    if (!newBuildNumber.trim()) {
      toast.error('Build number is required');
      return;
    }

    setCreatingBuild(true);
    try {
      const res = await api.createBuild(newBuildNumber.trim(), Number(selectedProjectIdForBuild));
      if (res.success) {
        setBuilds([res.data, ...builds]);
        setNewBuildNumber('');
        toast.success('Build created successfully!');
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create build');
    } finally {
      setCreatingBuild(false);
    }
  };

  const handleDeleteBuild = async (buildId: number) => {
    showConfirm(
      'Delete Build?',
      'Are you sure you want to delete this build?',
      async () => {
        try {
          const res = await api.deleteBuild(buildId);
          if (res.success) {
            setBuilds(builds.filter(b => b.id !== buildId));
            toast.success('Build deleted successfully!');
          } else { toast.error(res.message); }
        } catch (err: any) { toast.error(err.message || 'Failed to delete build'); }
      }
    );
  };

  const handleDeleteClient = async (clientId: number) => {
    showConfirm(
      'Delete Client?',
      'This will set Client to None on associated projects.',
      async () => {
        try {
          const res = await api.deleteClient(clientId);
          if (res.success) {
            setClients(clients.filter(c => c.id !== clientId));
            toast.success('Client deleted successfully!');
            fetchProjects();
          } else { toast.error(res.message); }
        } catch (err: any) { toast.error(err.message || 'Failed to delete client'); }
      }
    );
  };

  const handleDeleteProduct = async (productId: number) => {
    showConfirm(
      'Delete Product?',
      'This will cascade delete all modules and set Product to None on associated tasks.',
      async () => {
        try {
          const res = await api.deleteProduct(productId);
          if (res.success) {
            setProducts(products.filter(p => p.id !== productId));
            toast.success('Product deleted successfully!');
            if (selectedProjectIdForProduct) fetchProducts(Number(selectedProjectIdForProduct));
          } else { toast.error(res.message); }
        } catch (err: any) { toast.error(err.message || 'Failed to delete product'); }
      }
    );
  };

  const handleDeleteModule = async (moduleId: number) => {
    showConfirm(
      'Delete Module?',
      'This will set Module to None on all associated tasks.',
      async () => {
        try {
          const res = await api.deleteModule(moduleId);
          if (res.success) {
            setModules(modules.filter(m => m.id !== moduleId));
            toast.success('Module deleted successfully!');
            if (selectedProductIdForModule) fetchModules(Number(selectedProductIdForModule));
          } else { toast.error(res.message); }
        } catch (err: any) { toast.error(err.message || 'Failed to delete module'); }
      }
    );
  };

  const handleDeleteTaskFromList = async (workItemId: number) => {
    showConfirm(
      'Delete Task?',
      'This action cannot be undone. The task will be permanently removed.',
      async () => {
        try {
          const res = await api.deleteWorkItem(workItemId);
          if (res.success) {
            toast.success('Task deleted successfully!');
            if (selectedProject) fetchWorkItems(selectedProject.id);
          } else { toast.error(res.message); }
        } catch (err: any) { toast.error(err.message || 'Failed to delete task'); }
      }
    );
  };

  // ==================== EDIT TASK ====================
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingWorkItem, setEditingWorkItem] = useState<WorkItemDto | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [editTaskAssignedId, setEditTaskAssignedId] = useState<number | ''>('');
  const [editTaskStatus, setEditTaskStatus] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskLabels, setEditTaskLabels] = useState('');
  const [editTaskTeam, setEditTaskTeam] = useState('');
  const [editTaskRaisedBuild, setEditTaskRaisedBuild] = useState('');
  const [editTaskFixedBuild, setEditTaskFixedBuild] = useState('');
  const [editTaskSeverity, setEditTaskSeverity] = useState('');
  const [editTaskIssueType, setEditTaskIssueType] = useState('');
  const [savingEditTask, setSavingEditTask] = useState(false);
  const [editBuildsOptions, setEditBuildsOptions] = useState<{ buildNumber: string }[]>([]);

  const handleOpenEditTask = async (item: WorkItemDto) => {
    setEditingWorkItem(item);
    setEditTaskTitle(item.title || '');
    setEditTaskDesc(item.description || '');
    setEditTaskPriority((item.priority as any) || 'medium');
    setEditTaskAssignedId(item.assignedToUserId || '');
    setEditTaskStatus(item.status || '');
    setEditTaskDueDate(item.dueDate ? item.dueDate.substring(0, 10) : '');
    setEditTaskLabels(item.labels || '');
    setEditTaskTeam(item.team || '');
    setEditTaskRaisedBuild(item.raisedBuild || '');
    setEditTaskFixedBuild(item.fixedBuild || '');
    setEditTaskSeverity(item.severity || '3');
    setEditTaskIssueType(item.issueType || 'New');
    // Load build options for this project
    try {
      const buildsRes = await api.getBuildsByProject(item.projectId);
      if (buildsRes.success) setEditBuildsOptions(buildsRes.data);
    } catch (_) {}
    setShowEditTask(true);
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkItem || !selectedProject) return;
    if (!editTaskTitle.trim()) { toast.error('Title is required'); return; }
    setSavingEditTask(true);
    try {
      const res = await api.updateWorkItem(editingWorkItem.id, {
        title: editTaskTitle.trim(),
        description: editTaskDesc.trim() || null,
        priority: editTaskPriority,
        assignedToUserId: editTaskAssignedId === '' ? null : Number(editTaskAssignedId),
        status: editTaskStatus || undefined,
        dueDate: editTaskDueDate || null,
        labels: editTaskLabels || null,
        team: editTaskTeam || null,
        raisedBuild: editTaskRaisedBuild.trim() || null,
        fixedBuild: editTaskFixedBuild.trim() || null,
        severity: editTaskSeverity || null,
        issueType: editTaskIssueType || null,
        workType: editingWorkItem.workType,
        parentId: editingWorkItem.parentId || null,
        epicName: editingWorkItem.epicName || null,
        epicColor: editingWorkItem.epicColor || null,
        attachmentUrls: editingWorkItem.attachmentUrls || null,
        moduleId: editingWorkItem.moduleId || null,
      });
      if (res.success) {
        toast.success('Task updated successfully!');
        setShowEditTask(false);
        fetchWorkItems(selectedProject.id);
      } else {
        toast.error(res.message || 'Failed to update task');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task');
    } finally {
      setSavingEditTask(false);
    }
  };

  const handleSaveClientEdit = async (clientId: number) => {
    if (!editClientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    try {
      const res = await api.updateClient(clientId, editClientName.trim(), editClientDesc.trim() || undefined);
      if (res.success) {
        toast.success('Client updated successfully!');
        setClients(prev => prev.map(c => c.id === clientId ? res.data : c));
        setEditingClientId(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update client');
    }
  };

  const handleSaveProductEdit = async (productId: number, projectId: number) => {
    if (!editProductName.trim()) {
      toast.error('Product name is required');
      return;
    }
    try {
      const res = await api.updateProduct(productId, editProductName.trim(), editProductDesc.trim() || undefined, projectId);
      if (res.success) {
        toast.success('Product updated successfully!');
        setProducts(prev => prev.map(p => p.id === productId ? res.data : p));
        setEditingProductId(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update product');
    }
  };

  const handleSaveModuleEdit = async (moduleId: number, productId: number) => {
    if (!editModuleName.trim()) {
      toast.error('Module name is required');
      return;
    }
    try {
      const res = await api.updateModule(moduleId, editModuleName.trim(), editModuleDesc.trim() || undefined, productId);
      if (res.success) {
        toast.success('Module updated successfully!');
        setModules(prev => prev.map(m => m.id === moduleId ? res.data : m));
        setEditingModuleId(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update module');
    }
  };

  const handleSaveBuildEdit = async (buildId: number, projectId: number) => {
    if (!editBuildNumber.trim()) {
      toast.error('Build number is required');
      return;
    }
    try {
      const res = await api.updateBuild(buildId, editBuildNumber.trim(), projectId, editBuildIsActive);
      if (res.success) {
        toast.success('Build updated successfully!');
        setBuilds(prev => prev.map(b => b.id === buildId ? res.data : b));
        setEditingBuildId(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update build');
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
    fetchClients();
    fetchAllProjects();
  }, []);

  // Debounce search text so we don't fire an API call on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const debouncedWorkItemSearchQuery = useDebounce(workItemSearchQuery, 400);

  // Re-fetch projects when page or search query changes (excluding initial load)
  const isFirstRenderProjects = React.useRef(true);
  useEffect(() => {
    if (isFirstRenderProjects.current) {
      isFirstRenderProjects.current = false;
      return;
    }
    fetchProjects();
  }, [projectPage, debouncedSearchQuery]);

  // Re-fetch project work items when selected project, page, status, or search query changes
  useEffect(() => {
    if (selectedProject) {
      fetchWorkItems(selectedProject.id);
    }
  }, [selectedProject?.id, workItemPage, workItemStatusFilters, debouncedWorkItemSearchQuery, workItemAssigneeFilter, workItemDateFilter]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setWorkItemPage(1);
  }, [debouncedWorkItemSearchQuery, workItemStatusFilters, workItemAssigneeFilter, workItemDateFilter]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectNameError('');

    if (!newProjectName.trim()) {
      setProjectNameError('Project Name is required');
      return;
    }

    setCreatingProject(true);
    try {
      const res = await api.createProject({
        name: newProjectName,
        description: newProjectDesc,
        assignedEmployeeIds: selectedEmployeeIds,
        clientId: selectedClientIdForProject === '' ? undefined : Number(selectedClientIdForProject)
      });
      if (res.success) {
        setProjects([res.data, ...projects]);
        setAllProjects([res.data, ...allProjects]);
        setShowCreateProject(false);
        setNewProjectName('');
        setNewProjectDesc('');
        setProjectNameError('');
        setSelectedEmployeeIds([]);
        setSelectedClientIdForProject('');
        toast.success('Project created successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleUpdateMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setUpdatingMembers(true);
    try {
      const res = await api.updateProjectMembers(selectedProject.id, selectedEmployeeIds);
      if (res.success) {
        setSelectedProject({
          ...selectedProject,
          assignedEmployees: res.data.assignedEmployees
        });
        setShowEditMembers(false);
        fetchProjects();
        toast.success('Project members updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update members');
    } finally {
      setUpdatingMembers(false);
    }
  };

  const handleCreateWorkItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkTitleError('');

    if (!newWorkTitle.trim()) {
      setWorkTitleError('Task Title is required');
      return;
    }

    if (!selectedProject) return;

    setCreatingWorkItem(true);
    try {
      const res = await api.createWorkItem(selectedProject.id, {
        title: newWorkTitle,
        description: newWorkDesc,
        priority: newWorkPriority,
        assignedToUserId: newWorkAssignedId === '' ? null : Number(newWorkAssignedId),
        raisedBuild: newWorkRaisedBuild || null,
        fixedBuild: newWorkFixedBuild || null
      });

      if (res.success) {
        // Refresh project details
        await fetchProjectDetails(selectedProject.id);
        setShowCreateWorkItem(false);
        setNewWorkTitle('');
        setNewWorkDesc('');
        setNewWorkPriority('medium');
        setNewWorkAssignedId('');
        setNewWorkRaisedBuild('');
        setNewWorkFixedBuild('');
        setWorkTitleError('');
        toast.success('Task created successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create work item');
    } finally {
      setCreatingWorkItem(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFiles(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const res = await api.uploadAttachment(file);
        if (res.success) {
          urls.push(res.data);
          toast.success(`Attached ${file.name}`);
        }
      }
      setUploadedAttachmentUrls(prev => [...prev, ...urls]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload attachments');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleCreateFunctionalRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkTitleError('');
    setProjectSelectError('');

    if (!selectedProjectIdForCreation) {
      setProjectSelectError('Project is required');
      return;
    }
    if (!newWorkTitle.trim()) {
      setWorkTitleError('Summary is required');
      return;
    }

    setCreatingWorkItem(true);
    try {
      const res = await api.createWorkItem(Number(selectedProjectIdForCreation), {
        title: newWorkTitle,
        description: newWorkDesc,
        priority: newWorkPriority,
        status: functionalStatus,
        workType: functionalWorkType,
        startDate: functionalStartDate || null,
        dueDate: functionalDueDate || null,
        parentId: functionalWorkType === 'Epic' ? null : (functionalParentId === '' ? null : Number(functionalParentId)),
        labels: functionalLabel || null,
        team: functionalTeam || null,
        attachmentUrls: uploadedAttachmentUrls.join(',') || null,
        assignedToUserId: newWorkAssignedId === '' ? null : Number(newWorkAssignedId),
        moduleId: selectedModuleIdForCreation === '' ? null : Number(selectedModuleIdForCreation),
        epicName: functionalWorkType === 'Epic' ? newEpicName || newWorkTitle : null,
        epicColor: functionalWorkType === 'Epic' ? newEpicColor : null,
        severity: functionalWorkType === 'Bug' ? bugSeverity : null,
        issueType: functionalWorkType === 'Bug' ? bugIssueType : null,
        raisedBuild: raisedBuildForCreation || null,
        fixedBuild: fixedBuildForCreation || null
      });

      if (res.success) {
        // Refresh work items list — reset to page 1 so new item is visible immediately
        if (selectedProject && selectedProject.id === Number(selectedProjectIdForCreation)) {
          setWorkItemPage(1);
          fetchWorkItems(selectedProject.id);
        }

        toast.success('Work item created successfully!');

        if (submissionType === 'another' || createAnother) {
          // Keep modal open, only clear summary (title), description & attachments
          setNewWorkTitle('');
          setNewWorkDesc('');
          setUploadedAttachmentUrls([]);
          setWorkTitleError('');
        } else if (submissionType === 'copy') {
          // Keep all form state intact so they can create a copy immediately
          toast.info('Form values kept. You can now modify and create a copy.');
        } else {
          // Close modal and reset fields
          setShowCreateFunctional(false);
          setNewWorkTitle('');
          setNewWorkDesc('');
          setNewWorkPriority('medium');
          setNewWorkAssignedId('');
          setFunctionalStartDate('');
          setFunctionalDueDate('');
          setFunctionalParentId('');
          setFunctionalLabel('');
          setFunctionalTeam('');
          setRaisedBuildForCreation('');
          setFixedBuildForCreation('');
          setSelectedClientIdForCreation('');
          setUploadedAttachmentUrls([]);
          setWorkTitleError('');
          setProjectSelectError('');
          setSelectedProductIdForCreation('');
          setSelectedModuleIdForCreation('');
          setProductsForCreation([]);
          setModulesForCreation([]);
          setBugSeverity('3');
          setBugIssueType('New');
          setNewEpicName('');
          setNewEpicColor('purple');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create work item');
    } finally {
      setCreatingWorkItem(false);
    }
  };

  const filteredProjects = projects;
  const totalProjectPages = projectsTotalPages;
  const paginatedProjects = projects;

  const handleDeleteProject = async () => {
    if (!confirmDeleteProject) return;
    setDeletingProject(true);
    try {
      const res = await api.deleteProject(confirmDeleteProject.id);
      if (res.success) {
        setProjects(prev => prev.filter(p => p.id !== confirmDeleteProject.id));
        setAllProjects(prev => prev.filter(p => p.id !== confirmDeleteProject.id));
        setConfirmDeleteProject(null);
        toast.success('Project deleted successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project');
    } finally {
      setDeletingProject(false);
    }
  };

  const handleOpenEditProject = () => {
    if (!selectedProject) return;
    setProjectToEdit(selectedProject);
    setEditProjectName(selectedProject.name);
    setEditProjectDesc(selectedProject.description || '');
    setEditProjectStatus(selectedProject.status || 'active');
    setEditProjectClientId(selectedProject.clientId || '');
    setShowEditProject(true);
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;
    if (!editProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }
    setUpdatingProject(true);
    try {
      const res = await api.updateProject(projectToEdit.id, {
        name: editProjectName.trim(),
        description: editProjectDesc.trim() || undefined,
        status: editProjectStatus,
        clientId: editProjectClientId === '' ? undefined : Number(editProjectClientId)
      });
      if (res.success) {
        toast.success('Project updated successfully!');
        if (selectedProject && selectedProject.id === projectToEdit.id) {
          setSelectedProject({
            ...selectedProject,
            name: res.data.name,
            description: res.data.description,
            status: res.data.status,
            clientId: res.data.clientId,
            clientName: res.data.clientName
          });
        }
        fetchProjects();
        fetchAllProjects();
        setShowEditProject(false);
        setProjectToEdit(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update project');
    } finally {
      setUpdatingProject(false);
    }
  };

  // ── Epic & Severity badge helpers ──────────────────────────────────────
  const EPIC_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
    purple: { bg: 'rgba(147,51,234,0.18)', border: 'rgba(147,51,234,0.4)', text: '#c084fc' },
    blue:   { bg: 'rgba(59,130,246,0.18)',  border: 'rgba(59,130,246,0.4)',  text: '#60a5fa' },
    teal:   { bg: 'rgba(20,184,166,0.18)',  border: 'rgba(20,184,166,0.4)',  text: '#2dd4bf' },
    green:  { bg: 'rgba(34,197,94,0.18)',   border: 'rgba(34,197,94,0.4)',   text: '#4ade80' },
    orange: { bg: 'rgba(249,115,22,0.18)',  border: 'rgba(249,115,22,0.4)',  text: '#fb923c' },
    red:    { bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.4)',   text: '#f87171' },
  };
  const renderEpicBadge = (item: WorkItemDto) => {
    if (item.workType === 'Epic' && (item.epicName || item.title)) {
      const color = EPIC_COLOR_MAP[item.epicColor || 'purple'] || EPIC_COLOR_MAP.purple;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: color.bg, border: `1px solid ${color.border}`, color: color.text, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
          ⚡ {item.epicName || item.title}
        </span>
      );
    }
    if (item.parentEpicName) {
      const color = EPIC_COLOR_MAP[item.parentEpicColor || 'purple'] || EPIC_COLOR_MAP.purple;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: color.bg, border: `1px solid ${color.border}`, color: color.text, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
          ⚡ {item.parentEpicName}
        </span>
      );
    }
    return null;
  };
  const SEVERITY_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
    '1': { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.35)',  text: '#4ade80' },
    '2': { bg: 'rgba(56,189,248,0.15)',  border: 'rgba(56,189,248,0.35)',  text: '#38bdf8' },
    '3': { bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.35)',  text: '#facc15' },
    '4': { bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.35)', text: '#fb923c' },
    '5': { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)',  text: '#f87171' },
    '6': { bg: 'rgba(220,38,38,0.25)',   border: 'rgba(220,38,38,0.45)',  text: '#ef4444' },
    minor:    { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.35)',  text: '#4ade80' },
    major:    { bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.35)',  text: '#facc15' },
    critical: { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)', text: '#fb923c' },
    blocker:  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  text: '#f87171' },
  };
  const renderSeverityBadge = (severity?: string | null) => {
    if (!severity) return null;
    const key = severity.toLowerCase();
    const c = SEVERITY_COLOR_MAP[key] || SEVERITY_COLOR_MAP['3'];
    const icons: Record<string, string> = { 
      '1': '🟢', '2': '🔵', '3': '🟡', '4': '🟠', '5': '🔴', '6': '⛔',
      minor: '🟢', major: '🟡', critical: '🔴', blocker: '⛔' 
    };
    const label = (key === '1' || key === '2' || key === '3' || key === '4' || key === '5' || key === '6') 
      ? `Severity ${key}` 
      : severity.charAt(0).toUpperCase() + severity.slice(1);
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: c.bg, border: `1px solid ${c.border}`, color: c.text, whiteSpace: 'nowrap' }}>
        {icons[key] || ''} {label}
      </span>
    );
  };
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* If a project is selected, show details layout */}
      {selectedProject ? (
        <div>
          {/* Back breadcrumb */}
          <div style={{ marginBottom: '20px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => { 
                setSelectedProject(null); 
                setWorkItemSearchQuery(''); 
                setWorkItemStatusFilters([]); 
                setWorkItemAssigneeFilter('all');
                setWorkItemDateFilter('');
              }}
              style={{ padding: '8px 16px' }}
            >
              ← Back to Projects
            </button>
          </div>

          {/* Project Details Panel */}
          <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className="badge badge-testing" style={{ fontSize: '0.8rem' }}>{selectedProject.projectNumber}</span>
                  <span className="badge badge-completed">{selectedProject.status}</span>
                  {selectedProject.clientName && (
                    <span className="badge" style={{ fontSize: '0.8rem', background: 'rgba(56, 189, 248, 0.15)', color: '#0ea5e9', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      Client: {selectedProject.clientName}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>{selectedProject.name}</h1>
                  {isPM && (
                    <button 
                      onClick={handleOpenEditProject}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem', height: 'fit-content' }}
                    >
                      Edit Project
                    </button>
                  )}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '800px', lineHeight: 1.6 }}>
                  {selectedProject.description || 'No description provided for this project.'}
                </p>
              </div>

              <div style={{ background: 'rgba(139, 122, 208, 0.05)', padding: '16px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <User size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Created By:</span>
                  <span style={{ fontWeight: 600 }}>{selectedProject.createdBy}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                  <Calendar size={16} style={{ color: 'var(--secondary)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Created On:</span>
                  <span style={{ fontWeight: 600 }}>{new Date(selectedProject.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Assigned Employees / Members */}
              <div style={{ background: 'rgba(139, 122, 208, 0.05)', padding: '16px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', minWidth: '240px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Assigned Members</span>
                  {isPM && (
                    <button
                      onClick={() => {
                        setSelectedEmployeeIds(selectedProject.assignedEmployees?.map(e => e.id) || []);
                        setShowEditMembers(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                  {selectedProject.assignedEmployees && selectedProject.assignedEmployees.length > 0 ? (
                    selectedProject.assignedEmployees.map(emp => (
                      <span 
                        key={emp.id} 
                        className="badge" 
                        style={{ fontSize: '0.78rem', background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' }}
                        title={emp.email}
                      >
                        {emp.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No members assigned.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Work Items Header */}
          <div className="page-header">
            <div>
              <h2>Work Items</h2>
              <p style={{ color: 'var(--text-muted)' }}>Tasks and issues tracked under this project.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {workItemsTotalCount > 0 && (
                <div className="glass-panel" style={{ display: 'flex', padding: '4px', gap: '4px', borderRadius: 'var(--radius-sm)', background: '#F1F5F9' }}>
                  <button 
                    className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('grid')}
                    style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', border: 'none' }}
                  >
                    <LayoutGrid size={14} />
                    <span>Grid</span>
                  </button>
                  <button 
                    className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('kanban')}
                    style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', border: 'none' }}
                  >
                    <Kanban size={14} />
                    <span>Board</span>
                  </button>
                </div>
              )}
              <button className="btn btn-secondary" onClick={handleExportProjectCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} />
                Export Project (CSV)
              </button>
              <button className="btn btn-primary" onClick={async () => {
                // Set project selection
                setSelectedProjectIdForCreation(selectedProject.id);
                setCreateAnother(false);
                // Pre-fetch builds, products, and modules immediately
                try {
                  const [buildsRes, prodRes] = await Promise.all([
                    api.getBuildsByProject(selectedProject.id),
                    api.getProducts(selectedProject.id)
                  ]);
                  if (buildsRes.success) setBuildsForCreation(buildsRes.data);
                  if (prodRes.success && prodRes.data.length > 0) {
                    setSelectedProductIdForCreation(prodRes.data[0].id);
                    const modRes = await api.getModules(prodRes.data[0].id);
                    if (modRes.success) setModulesForCreation(modRes.data);
                  } else {
                    setProductsForCreation([]);
                    setModulesForCreation([]);
                  }
                } catch (_) {}
                setShowCreateFunctional(true);
              }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusCircle size={16} />
                Create
              </button>
            </div>
          </div>

          {/* Work Items Search Bar */}
          {workItemsTotalCount > 0 && (
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '250px' }}>
                <Search size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search tasks by code (e.g. WRK-001), title, priority, status or assignee..."
                  value={workItemSearchQuery}
                  onChange={(e) => setWorkItemSearchQuery(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    width: '100%',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Employee Filter */}
                {(() => {
                  const uniqueAssignees = Array.from(new Set(
                    (selectedProject.workItems || [])
                      .map(w => w.assignedTo)
                      .filter((name): name is string => !!name)
                  ));
                  return (
                    <select
                      className="form-select"
                      value={workItemAssigneeFilter}
                      onChange={(e) => setWorkItemAssigneeFilter(e.target.value)}
                      style={{
                        width: '180px',
                        background: '#F8FAFC',
                        border: '1px solid var(--border-soft)',
                        color: 'var(--text-primary)',
                        height: '38px',
                        padding: '0 40px 0 12px',
                        borderRadius: 'var(--radius-md)',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Employees</option>
                      <option value="unassigned">Unassigned</option>
                      {uniqueAssignees.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  );
                })()}

                {/* Checkbox Multi-Select Status Dropdown */}
                <div style={{ position: 'relative', width: '180px' }}>
                  <button
                    type="button"
                    className="form-select"
                    onClick={() => setWorkItemStatusDropdownOpen(!workItemStatusDropdownOpen)}
                    style={{
                      width: '180px',
                      textAlign: 'left',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      background: '#F8FAFC',
                      border: '1px solid var(--border-soft)',
                      color: 'var(--text-primary)',
                      height: '38px',
                      padding: '0 30px 0 12px',
                      borderRadius: 'var(--radius-md)',
                      outline: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    {workItemStatusFilters.length === 0 
                      ? 'All Statuses' 
                      : `${workItemStatusFilters.length} Selected`}
                  </button>

                  {workItemStatusDropdownOpen && (
                    <>
                      <div 
                        onClick={() => setWorkItemStatusDropdownOpen(false)} 
                        style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                      />
                      <div 
                        className="glass-panel" 
                        style={{
                          position: 'absolute',
                          top: '42px',
                          left: 0,
                          right: 0,
                          zIndex: 999,
                          background: '#FFFFFF',
                          border: '1px solid var(--border-soft)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: 'var(--shadow-lg)',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          maxHeight: '260px',
                          overflowY: 'auto'
                        }}
                      >
                        {[
                          { id: 'pending', label: 'TO DO' },
                          { id: 'assigned', label: 'ASSIGNED' },
                          { id: 'reopened', label: 'REOPEN' },
                          { id: 'in_progress', label: 'IN PROGRESS' },
                          { id: 'future_release', label: 'MOVED TO FUTURE' },
                          { id: 'fixed', label: 'FIXED' },
                          { id: 'completed', label: 'RESOLVED' },
                          { id: 'closed', label: 'CLOSED' }
                        ].map((item) => {
                          const checked = workItemStatusFilters.includes(item.id);
                          return (
                            <label 
                              key={item.id} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                transition: 'background-color 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-glow)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  if (checked) {
                                    setWorkItemStatusFilters(prev => prev.filter(x => x !== item.id));
                                  } else {
                                    setWorkItemStatusFilters(prev => [...prev, item.id]);
                                  }
                                }}
                                style={{
                                  accentColor: 'var(--primary)',
                                  width: '15px',
                                  height: '15px',
                                  cursor: 'pointer'
                                }}
                              />
                              <span>{item.label}</span>
                            </label>
                          );
                        })}
                        <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <button 
                            type="button" 
                            onClick={() => setWorkItemStatusFilters([])}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Clear All
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setWorkItemStatusDropdownOpen(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Date Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={workItemDateFilter}
                    onChange={(e) => setWorkItemDateFilter(e.target.value)}
                    style={{
                      width: '150px',
                      background: '#F8FAFC',
                      border: '1px solid var(--border-soft)',
                      color: 'var(--text-primary)',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      outline: 'none',
                      padding: '0 10px',
                      cursor: 'pointer'
                    }}
                  />
                  {workItemDateFilter && (
                    <button 
                      type="button" 
                      onClick={() => setWorkItemDateFilter('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.82rem'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Work Items Grid */}
          {loadingDetails ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading work items...</p>
          ) : workItemsTotalCount === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: '12px' }} />
              <p>No work items created yet. Click "Add Work Item" to assign tasks to employees!</p>
            </div>
          ) : (() => {
            const filteredWorkItems = workItems;
            const totalWorkItemPages = workItemsTotalPages;
            const paginatedWorkItems = workItems;

            if (filteredWorkItems.length === 0) {
              return (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertCircle size={36} style={{ color: 'var(--warning)', marginBottom: '12px' }} />
                  <p>No tasks match your search or filter criteria.</p>
                </div>
              );
            }

            return (
              viewMode === 'kanban' ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px',
                  alignItems: 'start',
                  overflowX: 'auto',
                  paddingBottom: '20px'
                }}>
                  {KANBAN_COLUMNS.map((col) => {
                    const colItems = filteredWorkItems.filter(item => item.status === col.id);
                    return (
                      <div 
                        key={col.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                        style={{
                          background: col.bg,
                          border: `1px solid ${col.border}`,
                          borderRadius: '12px',
                          padding: '16px',
                          minHeight: '400px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          transition: 'background-color 0.2s, border-color 0.2s'
                        }}
                      >
                        {/* Column Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }}></span>
                            {col.title}
                          </h4>
                          <span style={{
                            background: '#F1F5F9',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontWeight: 600
                          }}>
                            {colItems.length}
                          </span>
                        </div>

                        {/* Column Body / Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
                          {colItems.length === 0 ? (
                            <div style={{
                              flexGrow: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px dashed var(--border-medium)',
                              borderRadius: '8px',
                              padding: '20px',
                              color: 'var(--text-muted)',
                              fontSize: '0.8rem',
                              textAlign: 'center'
                            }}>
                              Drag tasks here
                            </div>
                          ) : (
                            colItems.map((item) => (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                onClick={() => navigate(`/workitems/${item.id}`)}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '8px',
                                  padding: '12px',
                                  cursor: 'grab',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px',
                                  transition: 'transform 0.15s, box-shadow 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                                  e.currentTarget.style.borderColor = 'var(--primary)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)';
                                  e.currentTarget.style.borderColor = '#E2E8F0';
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{item.workNumber}</span>
                                  <span className={`badge badge-${item.priority}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>{item.priority}</span>
                                </div>
                                {/* Epic / Severity badges */}
                                {(renderEpicBadge(item) || renderSeverityBadge(item.severity)) && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '-2px' }}>
                                    {renderEpicBadge(item)}
                                    {renderSeverityBadge(item.severity)}
                                  </div>
                                )}
                                <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{item.title}</h5>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '8px', marginTop: '2px' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={12} />
                                    {item.assignedTo || 'Unassigned'}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}><input type="checkbox" disabled /></th>
                        <th>Work</th>
                        <th>Module</th>
                        <th>Assignee</th>
                        <th>Reporter</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Resolution</th>
                        <th style={{ textAlign: 'center' }}>Raised Build</th>
                        <th style={{ textAlign: 'center' }}>Fixed Build</th>
                        <th>Created</th>
                        <th>Updated</th>
                        <th>Due Date</th>
                        <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedWorkItems.map((item) => {
                        const resolution =
                          item.status === 'fixed' ? 'FIXED' :
                          item.status === 'completed' ? 'RESOLVED' :
                          item.status === 'closed' ? 'CLOSED' :
                          'Unresolved';
                        const resolutionColor =
                          item.status === 'fixed' ? '#34d399' :
                          item.status === 'completed' ? '#10B981' :
                          item.status === 'closed' ? '#6B7280' :
                          '#6B7280';
                        return (
                          <tr key={`task-${item.id}`}>
                            <td><input type="checkbox" /></td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {renderWorkTypeIcon(item.workType)}
                                  <a
                                    onClick={() => navigate(`/workitems/${item.id}`)}
                                    style={{
                                      color: 'var(--primary)',
                                      fontWeight: 700,
                                      textDecoration: 'underline',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {item.workNumber}
                                  </a>
                                  <span 
                                    onClick={() => navigate(`/workitems/${item.id}`)}
                                    style={{ color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                  >
                                    {item.title}
                                  </span>
                                </div>
                                {(renderEpicBadge(item) || renderSeverityBadge(item.severity)) && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '22px' }}>
                                    {renderEpicBadge(item)}
                                    {renderSeverityBadge(item.severity)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                {item.moduleName || '—'}
                              </span>
                            </td>
                            <td>
                              <select
                                className="form-select"
                                value={item.assignedToUserId ?? ''}
                                onChange={(e) => handleInlineAssigneeChange(item.id, e.target.value === '' ? '' : Number(e.target.value))}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.82rem',
                                  width: 'auto',
                                  minWidth: '130px',
                                  height: 'auto',
                                  borderRadius: '4px'
                                }}
                              >
                                <option value="">Unassigned</option>
                                {employees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>{renderUserAvatarAndName(item.createdBy)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {renderPriorityIcon(item.priority)}
                                <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{item.priority}</span>
                              </div>
                            </td>
                            <td>
                              <select
                                className="form-select"
                                value={item.status}
                                onChange={(e) => handleUpdateTaskStatusInProject(item.id, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.82rem',
                                  width: 'auto',
                                  minWidth: '130px',
                                  height: 'auto',
                                  borderRadius: '4px'
                                }}
                              >
                                <option value="pending">TO DO</option>
                                <option value="assigned">ASSIGNED</option>
                                <option value="reopened">REOPEN</option>
                                <option value="in_progress">IN PROGRESS</option>
                                <option value="future_release">MOVED TO FUTURE RELEASE</option>
                                <option value="fixed">FIXED</option>
                                <option value="completed">RESOLVED</option>
                              </select>
                            </td>
                            <td>
                              <span style={{
                                color: resolutionColor,
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                letterSpacing: '0.04em'
                              }}>
                                {resolution}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.raisedBuild ? (
                                <span style={{
                                  display: 'inline-block',
                                  background: 'rgba(251,146,60,0.12)',
                                  color: '#fb923c',
                                  border: '1px solid rgba(251,146,60,0.3)',
                                  borderRadius: '6px',
                                  padding: '3px 10px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  letterSpacing: '0.03em',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {item.raisedBuild}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.fixedBuild ? (
                                <span style={{
                                  display: 'inline-block',
                                  background: 'rgba(52,211,153,0.12)',
                                  color: '#34d399',
                                  border: '1px solid rgba(52,211,153,0.3)',
                                  borderRadius: '6px',
                                  padding: '3px 10px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  letterSpacing: '0.03em',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {item.fixedBuild}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                              )}
                            </td>
                            <td>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td>
                              <input
                                type="date"
                                className="form-input"
                                value={item.dueDate ? item.dueDate.substring(0, 10) : ''}
                                onChange={(e) => handleInlineDueDateChange(item.id, e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '0.82rem', width: 'auto', height: 'auto', borderRadius: '4px' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => navigate(`/workitems/${item.id}`)}
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="View details"
                                >
                                  View
                                </button>
                                {(isPM || item.createdByUserId === user?.userId) && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      onClick={() => handleOpenEditTask(item)}
                                      style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      title="Edit task"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger"
                                      onClick={() => handleDeleteTaskFromList(item.id)}
                                      style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      title="Delete task"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Pagination Controls */}
                  {totalWorkItemPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setWorkItemPage(prev => Math.max(prev - 1, 1))}
                        disabled={workItemPage === 1}
                        style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Page {workItemPage} of {totalWorkItemPages}
                      </span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setWorkItemPage(prev => Math.min(prev + 1, totalWorkItemPages))}
                        disabled={workItemPage === totalWorkItemPages}
                        style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )
            );
          })()}
        </div>
      ) : (
        // Project list view
        <div>
          <div className="page-header">
            <div>
              <h1>Projects</h1>
              <p style={{ color: 'var(--text-muted)' }}>
                {isPM ? 'Create and manage client and product development portfolios.' : 'Browse all active projects and click to view tasks.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {isPM && (
                <>
                  <button className="btn btn-secondary" onClick={handleExportAllCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={18} />
                    Export All (CSV)
                  </button>
                  <button className="btn btn-secondary" onClick={() => { fetchClients(); setShowHierarchyManager(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutGrid size={18} />
                    Hierarchy Setup
                  </button>
                </>
              )}
              {isPM && (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowCreateProject(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} />
                    Create Project
                  </button>
                  <button className="btn btn-primary" onClick={() => {
                    setSelectedProjectIdForCreation(allProjects.length > 0 ? allProjects[0].id : '');
                    setCreateAnother(false);
                    setShowCreateFunctional(true);
                  }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PlusCircle size={16} />
                    Create
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', marginBottom: '30px' }}>
            <Search size={20} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search projects by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                width: '100%',
                outline: 'none'
              }}
            />
          </div>

          {/* Projects Table */}
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading projects...</p>
          ) : filteredProjects.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Briefcase size={40} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <p>{isPM ? 'No projects found. Click "Create Project" to set up your first workspace.' : 'No projects available yet.'}</p>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '10px' }}>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Project Code</th>
                      <th>Project Name</th>
                      <th>Description</th>
                      <th>Created By</th>
                      <th>Created On</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProjects.map((p) => (
                      <tr key={p.id}>
                        <td onClick={() => fetchProjectDetails(p.id)} style={{ cursor: 'pointer' }}>
                          <span className="badge badge-testing" style={{ fontWeight: 700 }}>{p.projectNumber}</span>
                        </td>
                        <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => fetchProjectDetails(p.id)}>{p.name}</td>
                        <td style={{ color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => fetchProjectDetails(p.id)}>
                          {p.description || 'No description.'}
                        </td>
                        <td style={{ cursor: 'pointer' }} onClick={() => fetchProjectDetails(p.id)}>{p.createdBy}</td>
                        <td style={{ cursor: 'pointer' }} onClick={() => fetchProjectDetails(p.id)}>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td style={{ cursor: 'pointer' }} onClick={() => fetchProjectDetails(p.id)}>
                          <span className="badge badge-completed">{p.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', cursor: 'pointer' }}
                              onClick={() => fetchProjectDetails(p.id)}
                            >
                              <span>View</span>
                              <ChevronRight size={16} />
                            </div>
                            {isPM && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setProjectToEdit(p);
                                  setEditProjectName(p.name);
                                  setEditProjectDesc(p.description || '');
                                  setEditProjectStatus(p.status || 'active');
                                  setEditProjectClientId(p.clientId || '');
                                  setShowEditProject(true);
                                }}
                                style={{
                                  background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
                                  border: '1px solid rgba(59,130,246,0.25)', borderRadius: 'var(--radius-sm)',
                                  padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem'
                                }}
                                title="Edit project"
                              >
                                <Edit size={13} /> Edit
                              </button>
                            )}
                            {isPM && (
                              <button
                                onClick={e => { e.stopPropagation(); setConfirmDeleteProject(p); }}
                                style={{
                                  background: 'rgba(244,63,94,0.12)', color: '#f43f5e',
                                  border: '1px solid rgba(244,63,94,0.25)', borderRadius: 'var(--radius-sm)',
                                  padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem'
                                }}
                                title="Delete project"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalProjectPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setProjectPage(prev => Math.max(prev - 1, 1))}
                    disabled={projectPage === 1}
                    style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Page {projectPage} of {totalProjectPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setProjectPage(prev => Math.min(prev + 1, totalProjectPages))}
                    disabled={projectPage === totalProjectPages}
                    style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE FUNCTIONAL REQUIREMENTS MODAL (JIRA STYLE) */}
      {showCreateFunctional && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '850px', width: '95%', maxHeight: '92vh', overflowY: 'auto', padding: '28px' }}>
            <button className="modal-close" onClick={() => { setShowCreateFunctional(false); setWorkTitleError(''); setProjectSelectError(''); }}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '6px', fontWeight: 800, fontSize: '1.3rem' }} className="gradient-text">Create Work Item</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '20px' }}>Required fields are marked with an asterisk <span style={{ color: 'var(--danger)' }}>*</span></p>

            <form onSubmit={handleCreateFunctionalRequirement} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Client Selection */}
              <div className="form-group">
                <label htmlFor="funcClient">Client</label>
                <select
                  id="funcClient"
                  className="form-select"
                  value={selectedClientIdForCreation}
                  onChange={(e) => {
                    const clientVal = e.target.value === '' ? '' : Number(e.target.value);
                    setSelectedClientIdForCreation(clientVal);
                    // Reset project and modules if they don't match
                    if (clientVal) {
                      const selectedProj = allProjects.find(p => p.id === selectedProjectIdForCreation);
                      if (selectedProj && selectedProj.clientId !== clientVal) {
                        setSelectedProjectIdForCreation('');
                        setSelectedProductIdForCreation('');
                        setSelectedModuleIdForCreation('');
                        setProductsForCreation([]);
                        setModulesForCreation([]);
                        setBuildsForCreation([]);
                      }
                    }
                  }}
                >
                  <option value="">Select Client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Space / Project / Product selection */}
              <div className="form-group">
                <label htmlFor="funcSpace">Space/ Project/ Product <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  id="funcSpace"
                  className="form-select"
                  value={selectedProjectIdForCreation}
                  onChange={async (e) => {
                    const projIdVal = e.target.value === '' ? '' : Number(e.target.value);
                    setSelectedProjectIdForCreation(projIdVal);
                    setSelectedProductIdForCreation('');
                    setSelectedModuleIdForCreation('');
                    setProductsForCreation([]);
                    setModulesForCreation([]);
                    setBuildsForCreation([]);
                    
                    if (projIdVal) {
                      setProjectSelectError('');
                      // Auto-select Client
                      const proj = allProjects.find(p => p.id === projIdVal);
                      if (proj && proj.clientId) {
                        setSelectedClientIdForCreation(proj.clientId);
                      }
                      
                      try {
                        // Fetch Project builds
                        const buildsRes = await api.getBuildsByProject(projIdVal);
                        if (buildsRes.success) {
                          setBuildsForCreation(buildsRes.data);
                        }
                        
                        // Fetch Project Products
                        const prodRes = await api.getProducts(projIdVal);
                        if (prodRes.success && prodRes.data.length > 0) {
                          const firstProd = prodRes.data[0];
                          setSelectedProductIdForCreation(firstProd.id);
                          
                          // Load modules for this first product directly
                          const modRes = await api.getModules(firstProd.id);
                          if (modRes.success) {
                            setModulesForCreation(modRes.data);
                          }
                        }
                      } catch (err) {}
                    }
                  }}
                  style={projectSelectError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : {}}
                >
                  <option value="">Select Space/Project/Product...</option>
                  {allProjects
                    .filter(p => !selectedClientIdForCreation || p.clientId === selectedClientIdForCreation)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.projectNumber})
                      </option>
                    ))}
                </select>
                {projectSelectError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 500, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.9rem', lineHeight: 0 }}>♦</span>
                    <span>{projectSelectError}</span>
                  </div>
                )}
              </div>

              {/* Module selection (Product selection is hidden) */}
              <div className="form-group">
                <label htmlFor="funcModule">Module</label>
                <select
                  id="funcModule"
                  className="form-select"
                  value={selectedModuleIdForCreation}
                  disabled={!selectedProjectIdForCreation}
                  onChange={(e) => {
                    setSelectedModuleIdForCreation(e.target.value === '' ? '' : Number(e.target.value));
                  }}
                >
                  <option value="">Select Module...</option>
                  {modulesForCreation.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.moduleNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Type & Status Row */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Work Type */}
                <div className="form-group">
                  <label htmlFor="funcWorkType">Work type <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    id="funcWorkType"
                    className="form-select"
                    value={functionalWorkType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFunctionalWorkType(val);
                      if (val === 'Bug') {
                        setFunctionalStatus('new');
                      } else {
                        setFunctionalStatus('pending');
                      }
                    }}
                  >
                    {isPM && <option value="Epic">⚡ Epic</option>}
                    <option value="Task">☑️ Task</option>
                    <option value="Functional Requirements">⚡ Functional Requirements</option>
                    <option value="Design Update">⚠️ Design Update</option>
                    <option value="Bug">🐞 Bug</option>
                  </select>
                </div>

                {/* Status */}
                <div className="form-group">
                  <label htmlFor="funcStatus">Status</label>
                  <select
                    id="funcStatus"
                    className="form-select"
                    value={functionalStatus}
                    onChange={(e) => setFunctionalStatus(e.target.value)}
                  >
                    {functionalWorkType === 'Bug' ? (
                      <>
                        <option value="new">New</option>
                        <option value="open">Open</option>
                      </>
                    ) : (
                      <>
                        <option value="pending">TO DO</option>
                        <option value="assigned">ASSIGNED</option>
                        <option value="reopened">REOPEN</option>
                        <option value="in_progress">IN PROGRESS</option>
                        <option value="future_release">MOVED TO FUTURE RELEASE</option>
                        <option value="fixed">FIXED</option>
                        <option value="completed">RESOLVED</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Bug Issue Type Row */}
              {functionalWorkType === 'Bug' && (
                <div className="form-group">
                  <label htmlFor="bugIssueType">Issue Type</label>
                  <select
                    id="bugIssueType"
                    className="form-select"
                    value={bugIssueType}
                    onChange={(e) => setBugIssueType(e.target.value)}
                  >
                    <option value="New">New</option>
                    <option value="Reopen">Reopen</option>
                  </select>
                </div>
              )}

              {/* Build Numbers Row (visible if project selected) */}
              {selectedProjectIdForCreation && (
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="funcRaisedBuild">Raised Build Number</label>
                    <select
                      id="funcRaisedBuild"
                      className="form-select"
                      value={raisedBuildForCreation}
                      onChange={(e) => setRaisedBuildForCreation(e.target.value)}
                    >
                      <option value="">-- Select Build --</option>
                      {buildsForCreation.map((b) => (
                        <option key={b.id} value={b.buildNumber}>
                          {b.buildNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="funcFixedBuild">Fixed Build Number</label>
                    <select
                      id="funcFixedBuild"
                      className="form-select"
                      value={fixedBuildForCreation}
                      onChange={(e) => setFixedBuildForCreation(e.target.value)}
                    >
                      <option value="">-- Select Build --</option>
                      {buildsForCreation.map((b) => (
                        <option key={b.id} value={b.buildNumber}>
                          {b.buildNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="form-group">
                <label htmlFor="funcSummary">Summary <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="funcSummary"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Implement user login flow validation"
                  value={newWorkTitle}
                  onChange={(e) => {
                    setNewWorkTitle(e.target.value);
                    if (e.target.value.trim()) setWorkTitleError('');
                  }}
                  style={workTitleError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : {}}
                />
                {workTitleError && (
                  <div style={{
                    color: 'var(--danger)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{ fontSize: '0.9rem', lineHeight: 0 }}>♦</span>
                    <span>{workTitleError}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="funcDesc">Description</label>
                <textarea
                  id="funcDesc"
                  className="form-textarea"
                  rows={4}
                  placeholder="Press Ctrl + / to learn time-saving keyboard shortcuts."
                  value={newWorkDesc}
                  onChange={(e) => setNewWorkDesc(e.target.value)}
                  style={{ fontSize: '0.92rem' }}
                />
              </div>

              {/* Assignee Selection */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="funcAssignee" style={{ marginBottom: 0 }}>Assign To</label>
                </div>
                <select
                  id="funcAssignee"
                  className="form-select"
                  value={newWorkAssignedId}
                  onChange={(e) => setNewWorkAssignedId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">-- Unassigned --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority + Conditional: Severity (Bug) | Epic Name+Color (Epic) | Epic Link (Others) */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Priority */}
                <div className="form-group">
                  <label htmlFor="funcPriority">Priority</label>
                  <select
                    id="funcPriority"
                    className="form-select"
                    value={newWorkPriority}
                    onChange={(e) => setNewWorkPriority(e.target.value as any)}
                  >
                    <option value="low">🔽 Low</option>
                    <option value="medium">🔶 Medium</option>
                    <option value="high">🔴 High</option>
                    <option value="critical">🚨 Critical</option>
                  </select>
                </div>

                {/* Bug → Severity */}
                {functionalWorkType === 'Bug' && (
                  <div className="form-group">
                    <label htmlFor="funcSeverity">Severity</label>
                    <select
                      id="funcSeverity"
                      className="form-select"
                      value={bugSeverity}
                      onChange={(e) => setBugSeverity(e.target.value)}
                    >
                      <option value="1">1 (Highest)</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5 (Lowest)</option>
                    </select>
                  </div>
                )}

                {/* Epic → Epic Color */}
                {functionalWorkType === 'Epic' && (
                  <div className="form-group">
                    <label htmlFor="funcEpicColor">Epic Color</label>
                    <select
                      id="funcEpicColor"
                      className="form-select"
                      value={newEpicColor}
                      onChange={(e) => setNewEpicColor(e.target.value)}
                    >
                      <option value="purple">🟣 Purple</option>
                      <option value="blue">🔵 Blue</option>
                      <option value="teal">💠 Teal</option>
                      <option value="green">🟢 Green</option>
                      <option value="orange">🟠 Orange</option>
                      <option value="red">🔴 Red</option>
                    </select>
                  </div>
                )}

                {/* Task/FR/Design → Epic Link */}
                {functionalWorkType !== 'Bug' && functionalWorkType !== 'Epic' && (
                  <div className="form-group">
                    <label htmlFor="funcParent">Epic Link</label>
                    <select
                      id="funcParent"
                      className="form-select"
                      value={functionalParentId}
                      onChange={(e) => setFunctionalParentId(e.target.value === '' ? '' : Number(e.target.value))}
                    >
                      <option value="">No Epic</option>
                      {(selectedProjectIdForCreation
                        ? projects.find(p => p.id === Number(selectedProjectIdForCreation))?.workItems || []
                        : []
                      ).filter(item => item.workType === 'Epic').map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.workNumber}
                        </option>
                      ))}
                    </select>
                    <span style={{ color: 'var(--text-disabled)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                      Link this item to an existing Epic.
                    </span>
                  </div>
                )}
              </div>

              {/* Epic → Epic Name (short label) */}
              {functionalWorkType === 'Epic' && (
                <div className="form-group">
                  <label htmlFor="funcEpicName">Epic Name <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>(short label shown on cards)</span></label>
                  <input
                    id="funcEpicName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Auth Flow, Billing, Core UI…"
                    value={newEpicName}
                    onChange={(e) => setNewEpicName(e.target.value)}
                  />
                </div>
              )}


              {/* Due Date & Start Date Row */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Due Date */}
                <div className="form-group">
                  <label htmlFor="funcDueDate">Due date</label>
                  <input
                    id="funcDueDate"
                    type="date"
                    className="form-input"
                    value={functionalDueDate}
                    onChange={(e) => setFunctionalDueDate(e.target.value)}
                  />
                </div>

                {/* Start Date */}
                <div className="form-group">
                  <label htmlFor="funcStartDate">Start date</label>
                  <input
                    id="funcStartDate"
                    type="date"
                    className="form-input"
                    value={functionalStartDate}
                    onChange={(e) => setFunctionalStartDate(e.target.value)}
                  />
                  <span style={{ color: 'var(--text-disabled)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                    Allows the planned start date for a piece of work to be set.
                  </span>
                </div>
              </div>

              {/* Labels & Team Row */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Labels */}
                <div className="form-group">
                  <label htmlFor="funcLabels">Label</label>
                  <select
                    id="funcLabels"
                    className="form-select"
                    value={functionalLabel}
                    onChange={(e) => setFunctionalLabel(e.target.value)}
                  >
                    <option value="">Select label</option>
                    <option value="mobileapp">Mobile App</option>
                    <option value="webapp">Web App</option>
                    <option value="mobileapp/webapp">Mobile,Web App</option>
                  </select>
                </div>

                {/* Team */}
                <div className="form-group">
                  <label htmlFor="funcTeam">Team</label>
                  <select
                    id="funcTeam"
                    className="form-select"
                    value={functionalTeam}
                    onChange={(e) => setFunctionalTeam(e.target.value)}
                  >
                    <option value="">Choose a team</option>
                    <option value="Frontend Team">Frontend Team</option>
                    <option value="Backend Team">Backend Team</option>
                    <option value="QA Team">QA Team</option>
                    <option value="DevOps Team">DevOps Team</option>
                  </select>
                  <span style={{ color: 'var(--text-disabled)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                    Associates a team to an issue. You can use this field to search.
                  </span>
                </div>
              </div>

              {/* Attachment */}
              <div className="form-group">
                <label>Attachment</label>
                <div 
                  style={{
                    border: '2px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    textAlign: 'center',
                    background: '#F8FAFC',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background-color 0.2s'
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
                    setUploadingFiles(true);
                    try {
                      const urls: string[] = [];
                      for (let i = 0; i < e.dataTransfer.files.length; i++) {
                        const file = e.dataTransfer.files[i];
                        const res = await api.uploadAttachment(file);
                        if (res.success) {
                          urls.push(res.data);
                          toast.success(`Attached ${file.name}`);
                        }
                      }
                      setUploadedAttachmentUrls(prev => [...prev, ...urls]);
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to upload attachments');
                    } finally {
                      setUploadingFiles(false);
                    }
                  }}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachmentUpload}
                    style={{ display: 'none' }}
                    id="jiraFileInput"
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.8rem', color: 'var(--text-muted)' }}>☁️</span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      Drop files to attach or{' '}
                      <label 
                        htmlFor="jiraFileInput" 
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: 'var(--primary)',
                          border: '1px solid var(--primary)',
                          borderRadius: '4px',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          marginLeft: '6px'
                        }}
                      >
                        Browse
                      </label>
                    </span>
                  </div>
                </div>

                {/* Uploaded attachments list */}
                {uploadedAttachmentUrls.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attached Files:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {uploadedAttachmentUrls.map((url, idx) => {
                        const fileName = url.substring(url.lastIndexOf('/') + 1);
                        return (
                          <div 
                            key={idx} 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#F8FAFC',
                              border: '1px solid var(--border-soft)',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '0.78rem'
                            }}
                          >
                            <a href={`${API_BASE_URL}${url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}>
                              📎 {fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName}
                            </a>
                            <button
                              type="button"
                              onClick={() => setUploadedAttachmentUrls(prev => prev.filter((_, i) => i !== idx))}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                padding: '0 2px'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {uploadingFiles && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '6px', display: 'block' }}>
                    ⏳ Uploading files...
                  </span>
                )}
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-soft)', paddingTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateFunctional(false); setWorkTitleError(''); setProjectSelectError(''); }}>
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    type="submit" 
                    className="btn btn-secondary" 
                    style={{ borderColor: 'var(--border-medium)', color: 'var(--text-secondary)' }}
                    onClick={() => setSubmissionType('copy')}
                    disabled={creatingWorkItem || uploadingFiles}
                  >
                    {creatingWorkItem && submissionType === 'copy' ? 'Creating...' : 'Create Copy'}
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    onClick={() => setSubmissionType('another')}
                    disabled={creatingWorkItem || uploadingFiles}
                  >
                    {creatingWorkItem && submissionType === 'another' ? 'Creating...' : 'Create Another'}
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    onClick={() => setSubmissionType('standard')}
                    disabled={creatingWorkItem || uploadingFiles}
                  >
                    {creatingWorkItem && submissionType === 'standard' ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE PROJECT MODAL */}
      {showCreateProject && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => { setShowCreateProject(false); setProjectNameError(''); }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '24px', fontWeight: 800 }} className="gradient-text">Create Project</h2>
            <form onSubmit={handleCreateProject} noValidate>
              <div className="form-group">
                <label htmlFor="projName">Project Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="projName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ticketing Dashboard App"
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    if (e.target.value.trim()) setProjectNameError('');
                  }}
                  style={projectNameError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : {}}
                />
                {projectNameError && (
                  <div style={{
                    color: 'var(--danger)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    <span style={{ fontSize: '0.9rem', lineHeight: 0 }}>♦</span>
                    <span>{projectNameError}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="projClient">Client (Optional)</label>
                <select
                  id="projClient"
                  className="form-select"
                  value={selectedClientIdForProject}
                  onChange={(e) => setSelectedClientIdForProject(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">Select Client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.clientNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="projDesc">Project Description (Optional)</label>
                <textarea
                  id="projDesc"
                  className="form-textarea"
                  rows={3}
                  placeholder="Describe project deliverables..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ marginBottom: 0 }}>Assign Employees to Project</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEmployeeIds.length === employees.length) {
                        setSelectedEmployeeIds([]);
                      } else {
                        setSelectedEmployeeIds(employees.map(emp => emp.id));
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: 0
                    }}
                  >
                    {selectedEmployeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  background: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {employees.map(emp => (
                    <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(emp.id)}
                        onChange={() => {
                          if (selectedEmployeeIds.includes(emp.id)) {
                            setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                          } else {
                            setSelectedEmployeeIds(prev => [...prev, emp.id]);
                          }
                        }}
                        style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{emp.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({emp.email})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateProject(false); setProjectNameError(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingProject}>
                  {creatingProject ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HIERARCHY MANAGER MODAL */}
      {showHierarchyManager && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <button className="modal-close" onClick={() => setShowHierarchyManager(false)}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '6px', fontWeight: 800 }} className="gradient-text">Hierarchy Setup</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Manage Clients, Modules, and Builds for your workflow hierarchy.
            </p>

            {/* Tab navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-soft)', marginBottom: '24px', gap: '16px' }}>
              {(['clients', 'modules', 'builds'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setHierarchyTab(tab);
                    // Fetch list
                    if (tab === 'clients') fetchClients();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: hierarchyTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                    color: hierarchyTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                    padding: '8px 16px 12px 16px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    fontSize: '0.95rem'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: CLIENTS */}
            {hierarchyTab === 'clients' && (
              <div>
                <form onSubmit={handleCreateClient} style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-soft)', marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', fontWeight: 700 }}>Add Client</h4>
                  <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="clientName">Client Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        id="clientName"
                        type="text"
                        placeholder="e.g. Acme Corp"
                        className="form-input"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="clientDesc">Description (Optional)</label>
                      <input
                        id="clientDesc"
                        type="text"
                        placeholder="e.g. Enterprise client"
                        className="form-input"
                        value={newClientDesc}
                        onChange={(e) => setNewClientDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={creatingClient}>
                    {creatingClient ? 'Adding...' : 'Add Client'}
                  </button>
                </form>

                <h4 style={{ marginBottom: '12px', fontWeight: 700 }}>Existing Clients</h4>
                {clients.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No clients found.</p>
                ) : (
                  <div className="table-container">
                    <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th>Client Code</th>
                          <th>Name</th>
                          <th>Description</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map(c => {
                          const isEditing = editingClientId === c.id;
                          return (
                            <tr key={c.id}>
                              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{c.clientNumber}</td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="form-input"
                                    style={{ padding: '4px 8px', fontSize: '0.9rem', height: 'auto', background: 'white' }}
                                    value={editClientName}
                                    onChange={(e) => setEditClientName(e.target.value)}
                                  />
                                ) : (
                                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="form-input"
                                    style={{ padding: '4px 8px', fontSize: '0.9rem', height: 'auto', background: 'white' }}
                                    value={editClientDesc}
                                    onChange={(e) => setEditClientDesc(e.target.value)}
                                  />
                                ) : (
                                  c.description || '-'
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => handleSaveClientEdit(c.id)}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setEditingClientId(null)}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                          setEditingClientId(c.id);
                                          setEditClientName(c.name);
                                          setEditClientDesc(c.description || '');
                                        }}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Edit size={12} /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={() => handleDeleteClient(c.id)}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Trash2 size={12} /> Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: MODULES */}
            {hierarchyTab === 'modules' && (
              <div>
                <form onSubmit={handleCreateModule} style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-soft)', marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', fontWeight: 700 }}>Add Module</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="modProject">Select Project <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select
                        id="modProject"
                        className="form-select"
                        value={selectedProjectIdForModule}
                        onChange={async (e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setSelectedProjectIdForModule(val);
                          setModules([]);
                          if (val) {
                            // Load products under this project
                            try {
                              const res = await api.getProducts(val);
                              if (res.success && res.data.length > 0) {
                                const prod = res.data[0];
                                setSelectedProductIdForModule(prod.id);
                                fetchModules(prod.id);
                              }
                            } catch (_) {}
                          }
                        }}
                      >
                        <option value="">Choose Project...</option>
                        {allProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.projectNumber})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="modName">Module Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        id="modName"
                        type="text"
                        placeholder="e.g. Authentication Module"
                        className="form-input"
                        value={newModuleName}
                        onChange={(e) => setNewModuleName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="modDesc">Description (Optional)</label>
                      <input
                        id="modDesc"
                        type="text"
                        placeholder="e.g. Login, signup, JWT handler"
                        className="form-input"
                        value={newModuleDesc}
                        onChange={(e) => setNewModuleDesc(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={creatingModule}>
                    {creatingModule ? 'Adding...' : 'Add Module'}
                  </button>
                </form>

                <h4 style={{ marginBottom: '12px', fontWeight: 700 }}>
                  {selectedProductIdForModule ? `Modules in this Project` : `Select project to view modules`}
                </h4>
                {!selectedProductIdForModule ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Choose project from dropdown above to filter modules.</p>
                ) : modules.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No modules registered under this project yet.</p>
                ) : (
                  <div className="table-container">
                    <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th>Module Code</th>
                          <th>Name</th>
                          <th>Description</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map(m => {
                          const isEditing = editingModuleId === m.id;
                          return (
                            <tr key={m.id}>
                              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{m.moduleNumber}</td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="form-input"
                                    style={{ padding: '4px 8px', fontSize: '0.9rem', height: 'auto', background: 'white' }}
                                    value={editModuleName}
                                    onChange={(e) => setEditModuleName(e.target.value)}
                                  />
                                ) : (
                                  <span style={{ fontWeight: 600 }}>{m.name}</span>
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="form-input"
                                    style={{ padding: '4px 8px', fontSize: '0.9rem', height: 'auto', background: 'white' }}
                                    value={editModuleDesc}
                                    onChange={(e) => setEditModuleDesc(e.target.value)}
                                  />
                                ) : (
                                  m.description || '-'
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => handleSaveModuleEdit(m.id, m.productId)}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setEditingModuleId(null)}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                          setEditingModuleId(m.id);
                                          setEditModuleName(m.name);
                                          setEditModuleDesc(m.description || '');
                                        }}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Edit size={12} /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={() => handleDeleteModule(m.id)}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Trash2 size={12} /> Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: BUILDS */}
            {hierarchyTab === 'builds' && (
              <div>
                <form onSubmit={handleCreateBuild} style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-soft)', marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', fontWeight: 700 }}>Add Software Build</h4>
                  <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="buildProject">Select Project <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select
                        id="buildProject"
                        className="form-select"
                        value={selectedProjectIdForBuild}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setSelectedProjectIdForBuild(val);
                          if (val) fetchBuilds(val);
                          else setBuilds([]);
                        }}
                      >
                        <option value="">Choose Project...</option>
                        {allProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.projectNumber})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="buildNum">Build Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        id="buildNum"
                        type="text"
                        placeholder="e.g. v1.0.0"
                        className="form-input"
                        value={newBuildNumber}
                        onChange={(e) => setNewBuildNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={creatingBuild}>
                    {creatingBuild ? 'Adding...' : 'Add Build'}
                  </button>
                </form>

                <h4 style={{ marginBottom: '12px', fontWeight: 700 }}>
                  {selectedProjectIdForBuild ? `Builds in this Project` : `Select a project to view builds`}
                </h4>
                {!selectedProjectIdForBuild ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Choose a project from the dropdown above to filter builds.</p>
                ) : builds.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No builds registered under this project yet.</p>
                ) : (
                  <div className="table-container">
                    <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th>Build Number</th>
                          <th>Status</th>
                          <th>Created At</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {builds.map(b => {
                          const isEditing = editingBuildId === b.id;
                          return (
                            <tr key={b.id}>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="form-input"
                                    style={{ padding: '4px 8px', fontSize: '0.9rem', height: 'auto', background: 'white' }}
                                    value={editBuildNumber}
                                    onChange={(e) => setEditBuildNumber(e.target.value)}
                                  />
                                ) : (
                                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{b.buildNumber}</span>
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={editBuildIsActive}
                                      onChange={(e) => setEditBuildIsActive(e.target.checked)}
                                    />
                                    <span>Active</span>
                                  </label>
                                ) : (
                                  <span className={`badge ${b.isActive ? 'badge-completed' : 'badge-testing'}`}>
                                    {b.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                )}
                              </td>
                              <td>{new Date(b.createdAt).toLocaleString()}</td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => handleSaveBuildEdit(b.id, b.projectId)}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setEditingBuildId(null)}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                          setEditingBuildId(b.id);
                                          setEditBuildNumber(b.buildNumber);
                                          setEditBuildIsActive(b.isActive);
                                        }}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Edit size={12} /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={() => handleDeleteBuild(b.id)}
                                        style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Trash2 size={12} /> Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {showEditTask && editingWorkItem && (
        <div className="modal-overlay" onClick={() => setShowEditTask(false)}>
          <div
            className="modal-content glass-panel"
            style={{ maxWidth: '620px', width: '96%', padding: '0', borderRadius: '16px', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Edit Task</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{editingWorkItem.workNumber} · {editingWorkItem.workType}</div>
              </div>
              <button className="modal-close" onClick={() => setShowEditTask(false)}><X size={20} /></button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditTask} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh', overflowY: 'auto' }}>

              {/* Title */}
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  className="form-input"
                  value={editTaskTitle}
                  onChange={e => setEditTaskTitle(e.target.value)}
                  placeholder="Task title"
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                <textarea
                  className="form-input"
                  value={editTaskDesc}
                  onChange={e => setEditTaskDesc(e.target.value)}
                  placeholder="Task description"
                  rows={3}
                  style={{ resize: 'vertical', minHeight: '72px' }}
                />
              </div>

              {/* Priority + Status */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</label>
                  <select className="form-select" value={editTaskPriority} onChange={e => setEditTaskPriority(e.target.value as any)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                  <select className="form-select" value={editTaskStatus} onChange={e => setEditTaskStatus(e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="fixed">Fixed</option>
                    <option value="closed">Closed</option>
                    <option value="reopened">Reopened</option>
                    <option value="future_release">Future Release</option>
                  </select>
                </div>
              </div>

              {/* Assigned To + Due Date */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned To</label>
                  <select className="form-select" value={editTaskAssignedId} onChange={e => setEditTaskAssignedId(e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">-- Unassigned --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Date</label>
                  <input type="date" className="form-input" value={editTaskDueDate} onChange={e => setEditTaskDueDate(e.target.value)} />
                </div>
              </div>

              {/* Labels + Team */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Labels</label>
                  <input className="form-input" value={editTaskLabels} onChange={e => setEditTaskLabels(e.target.value)} placeholder="e.g. frontend, api" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team</label>
                  <input className="form-input" value={editTaskTeam} onChange={e => setEditTaskTeam(e.target.value)} placeholder="e.g. Backend Team" />
                </div>
              </div>

              {/* Bug-specific fields */}
              {editingWorkItem.workType === 'Bug' && (
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Severity</label>
                    <select className="form-select" value={editTaskSeverity} onChange={e => setEditTaskSeverity(e.target.value)}>
                      <option value="1">1 - Critical</option>
                      <option value="2">2 - High</option>
                      <option value="3">3 - Medium</option>
                      <option value="4">4 - Low</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue Type</label>
                    <select className="form-select" value={editTaskIssueType} onChange={e => setEditTaskIssueType(e.target.value)}>
                      <option value="New">New</option>
                      <option value="Reopened">Reopened</option>
                      <option value="Enhancement">Enhancement</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Raised Build */}
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fb923c' }}>Raised Build Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-select"
                    value={editBuildsOptions.some(b => b.buildNumber === editTaskRaisedBuild) ? editTaskRaisedBuild : ''}
                    onChange={e => { if (e.target.value) setEditTaskRaisedBuild(e.target.value); }}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Select Build --</option>
                    {editBuildsOptions.map(b => (
                      <option key={b.buildNumber} value={b.buildNumber}>{b.buildNumber}</option>
                    ))}
                  </select>
                  <input
                    className="form-input"
                    value={editTaskRaisedBuild}
                    onChange={e => setEditTaskRaisedBuild(e.target.value)}
                    placeholder="or type custom"
                    style={{ flex: 1 }}
                  />
                </div>
                {editTaskRaisedBuild && (
                  <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#fb923c' }}>🟠 {editTaskRaisedBuild}</div>
                )}
              </div>

              {/* Fixed Build */}
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#34d399' }}>Fixed Build Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-select"
                    value={editBuildsOptions.some(b => b.buildNumber === editTaskFixedBuild) ? editTaskFixedBuild : ''}
                    onChange={e => { if (e.target.value) setEditTaskFixedBuild(e.target.value); }}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Select Build --</option>
                    {editBuildsOptions.map(b => (
                      <option key={b.buildNumber} value={b.buildNumber}>{b.buildNumber}</option>
                    ))}
                  </select>
                  <input
                    className="form-input"
                    value={editTaskFixedBuild}
                    onChange={e => setEditTaskFixedBuild(e.target.value)}
                    placeholder="or type custom"
                    style={{ flex: 1 }}
                  />
                </div>
                {editTaskFixedBuild && (
                  <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#34d399' }}>🟢 {editTaskFixedBuild}</div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--border-soft)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditTask(false)} disabled={savingEditTask}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingEditTask} style={{ minWidth: '100px' }}>
                  {savingEditTask ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Build Modal */}
      {showFixedBuildModal && (
        <div className="modal-overlay" onClick={handleCancelFixedBuild}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Select Fixed Build</h3>
              <button className="modal-close" onClick={handleCancelFixedBuild}><X size={20} /></button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fb923c', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Fixed Build Number</label>
                <select
                  className="form-select"
                  value={selectedFixedBuild}
                  onChange={e => {
                    setSelectedFixedBuild(e.target.value);
                    setCustomFixedBuild(''); // clear custom when dropdown selected
                  }}
                >
                  <option value="">-- Select Build Number --</option>
                  {modalBuildOptions.map(b => (
                    <option key={b.buildNumber} value={b.buildNumber}>{b.buildNumber}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0' }}>— OR —</div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Enter Custom Build Number</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Emed 1.01"
                  value={customFixedBuild}
                  onChange={e => {
                    setCustomFixedBuild(e.target.value);
                    setSelectedFixedBuild(''); // clear dropdown when typing custom
                  }}
                />
                {customFixedBuild.trim() && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✓</span> Will save as: <strong>{customFixedBuild.trim()}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={handleCancelFixedBuild}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmFixedBuild}
                  disabled={!selectedFixedBuild && !customFixedBuild.trim()}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT JIRA CSV MODAL */}
      {showImportJira && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '550px', width: '95%', padding: '28px' }}>
            <button className="modal-close" onClick={() => setShowImportJira(false)}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '8px', fontWeight: 800 }} className="gradient-text">Import JIRA CSV</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '24px' }}>
              Upload your exported JIRA CSV sheet. TeamTrack will dynamically resolve/create Projects, Users, Work Items (Tasks, Epics, Subtasks) and Bugs.
            </p>

            {!importSummary ? (
              <form onSubmit={handleJiraImport}>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label htmlFor="jiraFile">JIRA CSV File <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div 
                    style={{
                      border: '2px dashed var(--border-soft)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '30px 20px',
                      textAlign: 'center',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() => document.getElementById('jiraFileInput')?.click()}
                  >
                    <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {jiraCsvFile ? jiraCsvFile.name : 'Click to select CSV file'}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {jiraCsvFile ? `${(jiraCsvFile.size / 1024).toFixed(1)} KB` : 'Supports standard JIRA CSV exports'}
                    </p>
                  </div>
                  <input
                    type="file"
                    id="jiraFileInput"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setJiraCsvFile(e.target.files[0]);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowImportJira(false)} disabled={importingJira}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={importingJira || !jiraCsvFile}>
                    {importingJira ? 'Importing JIRA...' : 'Start Import'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{
                  background: 'rgba(74, 222, 128, 0.05)',
                  border: '1px solid rgba(74, 222, 128, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ color: '#16a34a', fontWeight: 700, marginBottom: '12px', fontSize: '0.95rem' }}>Import Completed Successfully</h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem', paddingLeft: '20px', color: 'var(--text-primary)' }}>
                    <li>Projects Imported/Resolved: <strong>{importSummary.projectsImported}</strong></li>
                    <li>Users Imported/Resolved: <strong>{importSummary.usersImported}</strong></li>
                    <li>Work Items (Tasks/Epics) Created/Updated: <strong>{importSummary.workItemsImported}</strong></li>
                    <li>Bugs Logged/Updated: <strong>{importSummary.bugsImported}</strong></li>
                  </ul>
                </div>

                {importSummary.warnings && importSummary.warnings.length > 0 && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.05)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    maxHeight: '120px',
                    overflowY: 'auto'
                  }}>
                    <h5 style={{ color: '#d97706', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Warnings</h5>
                    <ul style={{ fontSize: '0.78rem', color: '#b45309', paddingLeft: '16px' }}>
                      {importSummary.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setJiraCsvFile(null); setImportSummary(null); }}>
                    Import Another
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setShowImportJira(false)}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE WORK ITEM MODAL */}
      {showCreateWorkItem && selectedProject && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => { setShowCreateWorkItem(false); setWorkTitleError(''); }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '24px', fontWeight: 800 }} className="gradient-text">Add Work Item</h2>
            <form onSubmit={handleCreateWorkItem} noValidate>
              <div className="form-group">
                <label htmlFor="workTitle">Task Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="workTitle"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Implement login routing page"
                  value={newWorkTitle}
                  onChange={(e) => {
                    setNewWorkTitle(e.target.value);
                    if (e.target.value.trim()) setWorkTitleError('');
                  }}
                  style={workTitleError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : {}}
                />
                {workTitleError && (
                  <div style={{
                    color: 'var(--danger)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    <span style={{ fontSize: '0.9rem', lineHeight: 0 }}>♦</span>
                    <span>{workTitleError}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="workDesc">Description</label>
                <textarea
                  id="workDesc"
                  className="form-textarea"
                  rows={3}
                  placeholder="Details about task requirements..."
                  value={newWorkDesc}
                  onChange={(e) => setNewWorkDesc(e.target.value)}
                />
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label htmlFor="workPriority">Priority</label>
                  <select
                    id="workPriority"
                    className="form-select"
                    value={newWorkPriority}
                    onChange={(e) => setNewWorkPriority(e.target.value as any)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="workAssign">Assign To</label>
                  <select
                    id="workAssign"
                    className="form-select"
                    value={newWorkAssignedId}
                    onChange={(e) => setNewWorkAssignedId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">-- Unassigned --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Build Numbers */}
              {builds.length > 0 && (
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="newWorkRaisedBuild">Raised Build Number</label>
                    <select
                      id="newWorkRaisedBuild"
                      className="form-select"
                      value={newWorkRaisedBuild}
                      onChange={(e) => setNewWorkRaisedBuild(e.target.value)}
                    >
                      <option value="">-- Select Build --</option>
                      {builds.map((b) => (
                        <option key={b.id} value={b.buildNumber}>{b.buildNumber}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="newWorkFixedBuild">Fixed Build Number</label>
                    <select
                      id="newWorkFixedBuild"
                      className="form-select"
                      value={newWorkFixedBuild}
                      onChange={(e) => setNewWorkFixedBuild(e.target.value)}
                    >
                      <option value="">-- Select Build --</option>
                      {builds.map((b) => (
                        <option key={b.id} value={b.buildNumber}>{b.buildNumber}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateWorkItem(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingWorkItem}>
                  {creatingWorkItem ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* DELETE PROJECT CONFIRM MODAL */}
      {confirmDeleteProject && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ padding: '36px', maxWidth: '440px', width: '90%' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '68px', height: '68px', borderRadius: '50%',
                background: 'rgba(244,63,94,0.15)', margin: '0 auto 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Trash2 size={30} color="#f43f5e" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 10px' }}>Delete Project?</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                You are about to permanently delete{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {confirmDeleteProject.projectNumber} — {confirmDeleteProject.name}
                </strong>.
                <br />This will remove all tasks and data associated with it. This cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmDeleteProject(null)}
                style={{ flex: 1 }}
                disabled={deletingProject}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleDeleteProject}
                disabled={deletingProject}
                style={{
                  flex: 1, background: '#f43f5e', color: 'white', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {deletingProject ? 'Deleting...' : <><Trash2 size={16} /> Delete Project</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MEMBERS MODAL */}
      {showEditMembers && selectedProject && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setShowEditMembers(false)}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '6px', fontWeight: 800 }} className="gradient-text">Edit Project Members</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Manage who can access and create tasks for <strong>{selectedProject.name}</strong>.
            </p>
            <form onSubmit={handleUpdateMembers} noValidate>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ marginBottom: 0 }}>Select Employees</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEmployeeIds.length === employees.length) {
                        setSelectedEmployeeIds([]);
                      } else {
                        setSelectedEmployeeIds(employees.map(emp => emp.id));
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: 0
                    }}
                  >
                    {selectedEmployeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  background: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {employees.map(emp => (
                    <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(emp.id)}
                        onChange={() => {
                          if (selectedEmployeeIds.includes(emp.id)) {
                            setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                          } else {
                            setSelectedEmployeeIds(prev => [...prev, emp.id]);
                          }
                        }}
                        style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{emp.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({emp.email})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditMembers(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updatingMembers}>
                  {updatingMembers ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT DETAILS MODAL */}
      {showEditProject && projectToEdit && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '580px', width: '95%' }}>
            <button className="modal-close" onClick={() => setShowEditProject(false)}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '24px', fontWeight: 800 }} className="gradient-text">Edit Project Details</h2>
            <form onSubmit={handleEditProject} noValidate>
              <div className="form-group">
                <label htmlFor="editProjName">Project Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="editProjName"
                  type="text"
                  className="form-input"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  placeholder="e.g. Ticketing Dashboard App"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editProjDesc">Description</label>
                <textarea
                  id="editProjDesc"
                  className="form-textarea"
                  rows={4}
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  placeholder="Details about project scope and goals..."
                />
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label htmlFor="editProjStatus">Status</label>
                  <select
                    id="editProjStatus"
                    className="form-select"
                    value={editProjectStatus}
                    onChange={(e) => setEditProjectStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="editProjClient">Client</label>
                  <select
                    id="editProjClient"
                    className="form-select"
                    value={editProjectClientId}
                    onChange={(e) => setEditProjectClientId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">-- None --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditProject(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updatingProject}>
                  {updatingProject ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CUSTOM CONFIRM MODAL */}
      {customConfirm && createPortal(
        <div
          onClick={() => setCustomConfirm(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(6, 6, 18, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '92%',
              maxWidth: '400px',
              background: 'linear-gradient(145deg, rgba(20,20,40,0.98), rgba(15,15,30,0.99))',
              border: '1px solid rgba(239,68,68,0.3)',
              borderLeft: '4px solid #ef4444',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
              animation: 'slideUpFade 0.2s cubic-bezier(0.16,1,0.3,1)'
            }}
          >
            {/* Body */}
            <div style={{ padding: '28px 28px 24px', display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
              {/* Icon */}
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              </div>
              {/* Text */}
              <div style={{ paddingTop: '2px' }}>
                <div style={{ fontWeight: 800, fontSize: '1.08rem', color: '#f1f5f9', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                  {customConfirm.message}
                </div>
                {customConfirm.subtext && (
                  <div style={{ fontSize: '0.85rem', color: 'rgba(148,163,184,0.85)', lineHeight: 1.6 }}>
                    {customConfirm.subtext}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 28px' }} />

            {/* Buttons */}
            <div style={{ padding: '20px 28px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCustomConfirm(null)}
                style={{
                  padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(203,213,225,0.9)',
                  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                Cancel
              </button>
              <button
                onClick={() => { const cb = customConfirm.onConfirm; setCustomConfirm(null); cb(); }}
                style={{
                  padding: '9px 22px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                  transition: 'all 0.15s ease',
                  letterSpacing: '0.01em'
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(239,68,68,0.55)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(239,68,68,0.4)')}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const formatWorkItemStatus = (status: string) => {
  if (!status) return '';
  switch (status.toLowerCase()) {
    case 'pending': return 'TO DO';
    case 'assigned': return 'ASSIGNED';
    case 'reopened': return 'REOPEN';
    case 'in_progress': return 'IN PROGRESS';
    case 'waiting_customer': return 'WAITING FOR CUSTOMER';
    case 'future_release': return 'MOVED TO FUTURE RELEASE';
    case 'completed': return 'RESOLVED';
    default: return status.toUpperCase().replace('_', ' ');
  }
};

const renderPriorityIcon = (priority: string) => {
  const p = priority.toLowerCase();
  if (p === 'critical' || p === 'high') {
    return <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>⇈</span>;
  }
  if (p === 'medium') {
    return <span style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>＝</span>;
  }
  return <span style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>↓</span>;
};

const renderWorkTypeIcon = (type?: string) => {
  const t = (type || 'task').toLowerCase();
  if (t.includes('epic') || t.includes('functional') || t.includes('requirement')) {
    return <Zap size={15} fill="#C084FC" color="#A855F7" style={{ flexShrink: 0 }} />;
  }
  if (t.includes('bug')) {
    return <Bug size={15} fill="#FCA5A5" color="#EF4444" style={{ flexShrink: 0 }} />;
  }
  return <CheckSquare size={15} fill="#93C5FD" color="#2563EB" style={{ flexShrink: 0 }} />;
};

const renderUserAvatarAndName = (name?: string) => {
  const displayName = name || 'Unassigned';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = ['#1E3A8A', '#0D9488', '#0891B2', '#4F46E5', '#7C3AED', '#DB2777'];
  const charSum = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[charSum % colors.length];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
      <div style={{
        width: '24px', height: '24px',
        borderRadius: '50%',
        background: color,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.72rem',
        fontWeight: 800,
        flexShrink: 0
      }}>
        {initials}
      </div>
      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{displayName}</span>
    </div>
  );
};
