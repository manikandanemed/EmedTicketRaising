import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  api, 
  ProjectDto, 
  WorkItemDto, 
  EmployeeDropdownDto,
  API_BASE_URL
} from '../services/api';
import { useAuth } from '../App';
import { toast } from '../services/toast';
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
  CheckSquare
} from 'lucide-react';

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPM = user?.userType === 'ProductManager';

  // State for project list
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [projectsTotalCount, setProjectsTotalCount] = useState(0);
  const [projectsTotalPages, setProjectsTotalPages] = useState(1);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  const [workItemStatusFilter, setWorkItemStatusFilter] = useState('all');
  const [workItemAssigneeFilter, setWorkItemAssigneeFilter] = useState('all');
  const [workItemDateFilter, setWorkItemDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');

  const KANBAN_COLUMNS = [
    { id: 'pending', title: 'TO DO', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.04)', border: 'rgba(148, 163, 184, 0.15)' },
    { id: 'assigned', title: 'ASSIGNED', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.04)', border: 'rgba(148, 163, 184, 0.15)' },
    { id: 'reopened', title: 'REOPEN', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.04)', border: 'rgba(148, 163, 184, 0.15)' },
    { id: 'in_progress', title: 'IN PROGRESS', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.04)', border: 'rgba(56, 189, 248, 0.15)' },
    { id: 'waiting_customer', title: 'WAITING FOR CUSTOMER', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.04)', border: 'rgba(56, 189, 248, 0.15)' },
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

    // Optimistic Update: Update UI instantly
    const updatedWorkItems = workItems.map(w => 
      w.id === itemId ? { ...w, status: newStatus as any } : w
    );
    setWorkItems(updatedWorkItems);

    try {
      const res = await api.updateWorkItemStatus(itemId, newStatus);
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

    // Optimistic Update: Update UI instantly
    const updatedWorkItems = workItems.map(w => 
      w.id === itemId ? { ...w, status: newStatus as any } : w
    );
    setWorkItems(updatedWorkItems);

    try {
      const res = await api.updateWorkItemStatus(itemId, newStatus);
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

  // Pagination State
  const [projectPage, setProjectPage] = useState(1);
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
  const [hierarchyTab, setHierarchyTab] = useState<'clients' | 'products' | 'modules'>('clients');

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

  // Dynamic products & modules list inside Create Functional Requirement Modal
  const [productsForCreation, setProductsForCreation] = useState<ProductDto[]>([]);
  const [selectedProductIdForCreation, setSelectedProductIdForCreation] = useState<number | ''>('');
  const [modulesForCreation, setModulesForCreation] = useState<ModuleDto[]>([]);
  const [selectedModuleIdForCreation, setSelectedModuleIdForCreation] = useState<number | ''>('');

  // Project Client creation selection
  const [selectedClientIdForProject, setSelectedClientIdForProject] = useState<number | ''>('');

  const [showCreateWorkItem, setShowCreateWorkItem] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkDesc, setNewWorkDesc] = useState('');
  const [newWorkPriority, setNewWorkPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newWorkAssignedId, setNewWorkAssignedId] = useState<number | ''>('');
  const [employees, setEmployees] = useState<EmployeeDropdownDto[]>([]);
  const [creatingWorkItem, setCreatingWorkItem] = useState(false);
  const [workTitleError, setWorkTitleError] = useState('');

  const [confirmDeleteProject, setConfirmDeleteProject] = useState<ProjectDto | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

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

  const fetchWorkItems = async (projectId: number) => {
    setWorkItemsLoading(true);
    try {
      const res = await api.getWorkItemsByProjectPaged(projectId, {
        page: workItemPage,
        pageSize: WORK_ITEMS_PER_PAGE,
        status: workItemStatusFilter !== 'all' ? workItemStatusFilter : undefined,
        search: workItemSearchQuery || undefined
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

  const handleExportAllCSV = async () => {
    try {
      const res = await api.getAllProjects();
      if (!res.success) {
        toast.error('Failed to fetch projects for export: ' + res.message);
        return;
      }

      const allRows: any[] = [];

      for (const p of res.data) {
        if (p.workItems && Array.isArray(p.workItems)) {
          for (const w of p.workItems) {
            // Fetch comments for this work item
            let commentsText = '';
            try {
              const cmtRes = await api.getCommentsByWorkItem(w.id);
              if (cmtRes.success && cmtRes.data.length > 0) {
                commentsText = cmtRes.data
                  .map(c => `${c.postedBy} [${new Date(c.createdAt).toLocaleDateString()}]: ${c.message}`)
                  .join(' | ');
              }
            } catch (_) {}

            // Task row
            allRows.push({
              issueType: 'Task',
              projectCode: p.projectNumber,
              projectName: p.name,
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

            // Fetch bugs for this work item
            try {
              const bugRes = await api.getBugsByWorkItem(w.id);
              if (bugRes.success && bugRes.data.length > 0) {
                bugRes.data.forEach(b => {
                  allRows.push({
                    issueType: 'Bug',
                    projectCode: p.projectNumber,
                    projectName: p.name,
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
            } catch (_) {}
          }
        }
      }

      if (allRows.length === 0) {
        toast.info('No tasks found to export.');
        return;
      }

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

      const csvContent = '\uFEFF' + csvRows.join('\n');
      downloadCSV('teamtrack_all_issues_export.csv', csvContent);
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

      const allRows: any[] = [];

      for (const w of itemsToExport) {
        // Fetch comments for this work item
        let commentsText = '';
        try {
          const cmtRes = await api.getCommentsByWorkItem(w.id);
          if (cmtRes.success && cmtRes.data.length > 0) {
            commentsText = cmtRes.data
              .map(c => `${c.postedBy} [${new Date(c.createdAt).toLocaleDateString()}]: ${c.message}`)
              .join(' | ');
          }
        } catch (_) {}

        // Task row
        allRows.push({
          issueType: 'Task',
          projectCode: selectedProject.projectNumber,
          projectName: selectedProject.name,
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

        // Fetch bugs for this work item
        try {
          const bugRes = await api.getBugsByWorkItem(w.id);
          if (bugRes.success && bugRes.data.length > 0) {
            bugRes.data.forEach(b => {
              allRows.push({
                issueType: 'Bug',
                projectCode: selectedProject.projectNumber,
                projectName: selectedProject.name,
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
        } catch (_) {}
      }

      if (allRows.length === 0) {
        toast.info('No issues found to export for this project.');
        return;
      }

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

      const csvContent = '\uFEFF' + csvRows.join('\n');
      downloadCSV(`teamtrack_${selectedProject.projectNumber}_issues_export.csv`, csvContent);
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

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
    fetchClients();
  }, []);

  // Re-fetch projects when page or search query changes (excluding initial load)
  const isFirstRenderProjects = React.useRef(true);
  useEffect(() => {
    if (isFirstRenderProjects.current) {
      isFirstRenderProjects.current = false;
      return;
    }
    fetchProjects();
  }, [projectPage, searchQuery]);

  // Re-fetch project work items when selected project, page, status, or search query changes
  useEffect(() => {
    if (selectedProject) {
      fetchWorkItems(selectedProject.id);
    }
  }, [selectedProject?.id, workItemPage, workItemStatusFilter, workItemSearchQuery]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setWorkItemPage(1);
  }, [workItemSearchQuery, workItemStatusFilter]);

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
        assignedToUserId: newWorkAssignedId === '' ? null : Number(newWorkAssignedId)
      });

      if (res.success) {
        // Refresh project details
        await fetchProjectDetails(selectedProject.id);
        setShowCreateWorkItem(false);
        setNewWorkTitle('');
        setNewWorkDesc('');
        setNewWorkPriority('medium');
        setNewWorkAssignedId('');
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
        parentId: functionalParentId === '' ? null : Number(functionalParentId),
        labels: functionalLabel || null,
        team: functionalTeam || null,
        attachmentUrls: uploadedAttachmentUrls.join(',') || null,
        assignedToUserId: newWorkAssignedId === '' ? null : Number(newWorkAssignedId),
        moduleId: selectedModuleIdForCreation === '' ? null : Number(selectedModuleIdForCreation)
      });

      if (res.success) {
        // Refresh project details if we are viewing the target project
        if (selectedProject && selectedProject.id === Number(selectedProjectIdForCreation)) {
          await fetchProjectDetails(selectedProject.id);
        }

        // Refresh all projects list
        fetchProjects();

        toast.success('Work item created successfully!');

        if (createAnother) {
          // Keep modal open, only clear summary (title), description & attachments
          setNewWorkTitle('');
          setNewWorkDesc('');
          setUploadedAttachmentUrls([]);
          setWorkTitleError('');
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
          setUploadedAttachmentUrls([]);
          setWorkTitleError('');
          setProjectSelectError('');
          setSelectedProductIdForCreation('');
          setSelectedModuleIdForCreation('');
          setProductsForCreation([]);
          setModulesForCreation([]);
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
        setConfirmDeleteProject(null);
        toast.success('Project deleted successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project');
    } finally {
      setDeletingProject(false);
    }
  };

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
                setWorkItemStatusFilter('all'); 
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
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '12px' }}>{selectedProject.name}</h1>
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
              <button className="btn btn-primary" onClick={() => {
                setSelectedProjectIdForCreation(selectedProject.id);
                setCreateAnother(false);
                setShowCreateFunctional(true);
              }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusCircle size={16} />
                Create Functional Requirement
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
                        background: 'rgba(255,255,255,0.05)',
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

                {/* Status Filter */}
                <select
                  className="form-select"
                  value={workItemStatusFilter}
                  onChange={(e) => setWorkItemStatusFilter(e.target.value)}
                  style={{ 
                    width: '180px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-primary)',
                    height: '38px',
                    padding: '0 40px 0 12px',
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">TO DO</option>
                  <option value="assigned">ASSIGNED</option>
                  <option value="reopened">REOPEN</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="waiting_customer">WAITING FOR CUSTOMER</option>
                  <option value="future_release">MOVED TO FUTURE RELEASE</option>
                  <option value="fixed">FIXED</option>
                  <option value="completed">RESOLVED</option>
                  <option value="closed">CLOSED</option>
                </select>

                {/* Date Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={workItemDateFilter}
                    onChange={(e) => setWorkItemDateFilter(e.target.value)}
                    style={{
                      width: '150px',
                      background: 'rgba(255,255,255,0.05)',
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
                            background: 'rgba(255,255,255,0.05)',
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
                              border: '1px dashed rgba(255,255,255,0.03)',
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
                        <th>Assignee</th>
                        <th>Reporter</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Resolution</th>
                        <th>Created</th>
                        <th>Updated</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedWorkItems.map((item) => {
                        const isCompleted = item.status === 'completed' || item.status === 'closed' || item.status === 'fixed';
                        const resolution = isCompleted ? 'Resolved' : 'Unresolved';
                        return (
                          <tr key={`task-${item.id}`}>
                            <td><input type="checkbox" /></td>
                            <td>
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
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                  {item.title}
                                </span>
                              </div>
                            </td>
                            <td>{renderUserAvatarAndName(item.assignedTo)}</td>
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
                                <option value="waiting_customer">WAITING FOR CUSTOMER</option>
                                <option value="future_release">MOVED TO FUTURE RELEASE</option>
                                <option value="fixed">FIXED</option>
                                <option value="completed">RESOLVED</option>
                              </select>
                            </td>
                            <td>
                              <span style={{
                                color: isCompleted ? '#10B981' : '#6B7280',
                                fontWeight: 600,
                                fontSize: '0.85rem'
                              }}>
                                {resolution}
                              </span>
                            </td>
                            <td>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
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
                  <button className="btn btn-secondary" onClick={() => { setJiraCsvFile(null); setImportSummary(null); setShowImportJira(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={18} />
                    Import JIRA CSV
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
                    setSelectedProjectIdForCreation(projects.length > 0 ? projects[0].id : '');
                    setCreateAnother(false);
                    setShowCreateFunctional(true);
                  }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PlusCircle size={16} />
                    Create Functional Requirement
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
          <div className="modal-content glass-panel" style={{ maxWidth: '680px', width: '95%', maxHeight: '92vh', overflowY: 'auto', padding: '28px' }}>
            <button className="modal-close" onClick={() => { setShowCreateFunctional(false); setWorkTitleError(''); setProjectSelectError(''); }}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '6px', fontWeight: 800, fontSize: '1.6rem' }} className="gradient-text">Create Functional Requirements</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '20px' }}>Required fields are marked with an asterisk <span style={{ color: 'var(--danger)' }}>*</span></p>

            <form onSubmit={handleCreateFunctionalRequirement} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Space (Project selection) */}
              <div className="form-group">
                <label htmlFor="funcSpace">Space <span style={{ color: 'var(--danger)' }}>*</span></label>
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
                    if (projIdVal) {
                      setProjectSelectError('');
                      try {
                        const prodRes = await api.getProducts(projIdVal);
                        if (prodRes.success) {
                          setProductsForCreation(prodRes.data);
                        }
                      } catch (err) {}
                    }
                  }}
                  style={projectSelectError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : {}}
                >
                  <option value="">Select Space/Project...</option>
                  {projects.map((p) => (
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

              {/* Product and Module Cascading Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Product Selection */}
                <div className="form-group">
                  <label htmlFor="funcProduct">Product</label>
                  <select
                    id="funcProduct"
                    className="form-select"
                    value={selectedProductIdForCreation}
                    disabled={!selectedProjectIdForCreation}
                    onChange={async (e) => {
                      const prodIdVal = e.target.value === '' ? '' : Number(e.target.value);
                      setSelectedProductIdForCreation(prodIdVal);
                      setSelectedModuleIdForCreation('');
                      setModulesForCreation([]);
                      if (prodIdVal) {
                        try {
                          const modRes = await api.getModules(prodIdVal);
                          if (modRes.success) {
                            setModulesForCreation(modRes.data);
                          }
                        } catch (err) {}
                      }
                    }}
                  >
                    <option value="">Select Product...</option>
                    {productsForCreation.map((prd) => (
                      <option key={prd.id} value={prd.id}>
                        {prd.name} ({prd.productNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Module Selection */}
                <div className="form-group">
                  <label htmlFor="funcModule">Module</label>
                  <select
                    id="funcModule"
                    className="form-select"
                    value={selectedModuleIdForCreation}
                    disabled={!selectedProductIdForCreation}
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
              </div>

              {/* Work Type & Status Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Work Type */}
                <div className="form-group">
                  <label htmlFor="funcWorkType">Work type <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    id="funcWorkType"
                    className="form-select"
                    value={functionalWorkType}
                    onChange={(e) => setFunctionalWorkType(e.target.value)}
                  >
                    <option value="Epic">⚡ Epic</option>
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
                    <option value="pending">TO DO</option>
                    <option value="assigned">ASSIGNED</option>
                    <option value="reopened">REOPEN</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="waiting_customer">WAITING FOR CUSTOMER</option>
                    <option value="future_release">MOVED TO FUTURE RELEASE</option>
                    <option value="fixed">FIXED</option>
                    <option value="completed">RESOLVED</option>
                  </select>
                </div>
              </div>

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
                  <label htmlFor="funcAssignee" style={{ marginBottom: 0 }}>Assignee</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (user?.userId) {
                        setNewWorkAssignedId(user.userId);
                      } else {
                        toast.error('No logged-in user session found');
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    Assign to me
                  </button>
                </div>
                <select
                  id="funcAssignee"
                  className="form-select"
                  value={newWorkAssignedId}
                  onChange={(e) => setNewWorkAssignedId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">Automatic</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority & Parent Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Priority */}
                <div className="form-group">
                  <label htmlFor="funcPriority">Priority</label>
                  <select
                    id="funcPriority"
                    className="form-select"
                    value={newWorkPriority}
                    onChange={(e) => setNewWorkPriority(e.target.value as any)}
                  >
                    <option value="low">〓 Low</option>
                    <option value="medium">＝ Medium</option>
                    <option value="high">▲ High</option>
                    <option value="critical">▲ Critical</option>
                  </select>
                </div>

                {/* Parent Selection */}
                <div className="form-group">
                  <label htmlFor="funcParent">Parent</label>
                  <select
                    id="funcParent"
                    className="form-select"
                    value={functionalParentId}
                    onChange={(e) => setFunctionalParentId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">Select parent</option>
                    {(selectedProjectIdForCreation 
                      ? projects.find(p => p.id === Number(selectedProjectIdForCreation))?.workItems || [] 
                      : []
                    ).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.workNumber} - {item.title} ({item.workType || 'Task'})
                      </option>
                    ))}
                  </select>
                  <span style={{ color: 'var(--text-disabled)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                    Your work type hierarchy determines the work items you can select here.
                  </span>
                </div>
              </div>

              {/* Due Date & Start Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Labels */}
                <div className="form-group">
                  <label htmlFor="funcLabels">Labels</label>
                  <select
                    id="funcLabels"
                    className="form-select"
                    value={functionalLabel}
                    onChange={(e) => setFunctionalLabel(e.target.value)}
                  >
                    <option value="">Select label</option>
                    <option value="frontend">Frontend</option>
                    <option value="backend">Backend</option>
                    <option value="ui/ux">UI/UX</option>
                    <option value="bugfix">Bugfix</option>
                    <option value="database">Database</option>
                    <option value="documentation">Documentation</option>
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
                    background: 'rgba(255, 255, 255, 0.01)',
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
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid var(--border-soft)',
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
                              background: 'rgba(255, 255, 255, 0.04)',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginTop: '12px', borderTop: '1px solid var(--border-soft)', paddingTop: '20px' }}>
                {/* Create Another Checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={createAnother}
                    onChange={(e) => setCreateAnother(e.target.checked)}
                    style={{
                      accentColor: 'var(--primary)',
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Create another</span>
                </label>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateFunctional(false); setWorkTitleError(''); setProjectSelectError(''); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creatingWorkItem || uploadingFiles}>
                    {creatingWorkItem ? 'Creating...' : 'Create'}
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
              Manage Clients, Products, and Modules for your workflow hierarchy.
            </p>

            {/* Tab navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-soft)', marginBottom: '24px', gap: '16px' }}>
              {(['clients', 'products', 'modules'] as const).map(tab => (
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
                <form onSubmit={handleCreateClient} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-soft)', marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', fontWeight: 700 }}>Add Client</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map(c => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{c.clientNumber}</td>
                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                            <td>{c.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: PRODUCTS */}
            {hierarchyTab === 'products' && (
              <div>
                <form onSubmit={handleCreateProduct} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-soft)', marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', fontWeight: 700 }}>Add Product</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="prodProject">Select Project <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select
                        id="prodProject"
                        className="form-select"
                        value={selectedProjectIdForProduct}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setSelectedProjectIdForProduct(val);
                          if (val) fetchProducts(val);
                          else setProducts([]);
                        }}
                      >
                        <option value="">Choose Project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.projectNumber})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="prodName">Product Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        id="prodName"
                        type="text"
                        placeholder="e.g. Customer Portal App"
                        className="form-input"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="prodDesc">Description (Optional)</label>
                    <input
                      id="prodDesc"
                      type="text"
                      placeholder="e.g. Client-facing support app"
                      className="form-input"
                      value={newProductDesc}
                      onChange={(e) => setNewProductDesc(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={creatingProduct}>
                    {creatingProduct ? 'Adding...' : 'Add Product'}
                  </button>
                </form>

                <h4 style={{ marginBottom: '12px', fontWeight: 700 }}>
                  {selectedProjectIdForProduct ? `Products in this Project` : `Select a project to view products`}
                </h4>
                {!selectedProjectIdForProduct ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Choose a project from the dropdown above to filter products.</p>
                ) : products.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No products registered under this project yet.</p>
                ) : (
                  <div className="table-container">
                    <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th>Product Code</th>
                          <th>Name</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.productNumber}</td>
                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                            <td>{p.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: MODULES */}
            {hierarchyTab === 'modules' && (
              <div>
                <form onSubmit={handleCreateModule} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-soft)', marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', fontWeight: 700 }}>Add Module</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="modProject">Select Project <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select
                        id="modProject"
                        className="form-select"
                        value={selectedProjectIdForModule}
                        onChange={async (e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setSelectedProjectIdForModule(val);
                          setSelectedProductIdForModule('');
                          setModules([]);
                          if (val) {
                            // Load products under this project
                            try {
                              const res = await api.getProducts(val);
                              if (res.success) setProducts(res.data);
                            } catch (_) {}
                          } else {
                            setProducts([]);
                          }
                        }}
                      >
                        <option value="">Choose Project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.projectNumber})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="modProduct">Select Product <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select
                        id="modProduct"
                        className="form-select"
                        value={selectedProductIdForModule}
                        disabled={!selectedProjectIdForModule}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setSelectedProductIdForModule(val);
                          if (val) fetchModules(val);
                          else setModules([]);
                        }}
                      >
                        <option value="">Choose Product...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.productNumber})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                  {selectedProductIdForModule ? `Modules in this Product` : `Select project & product to view modules`}
                </h4>
                {!selectedProductIdForModule ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Choose project and product from dropdowns above to filter modules.</p>
                ) : modules.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No modules registered under this product yet.</p>
                ) : (
                  <div className="table-container">
                    <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th>Module Code</th>
                          <th>Name</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map(m => (
                          <tr key={m.id}>
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{m.moduleNumber}</td>
                            <td style={{ fontWeight: 600 }}>{m.name}</td>
                            <td>{m.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
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
