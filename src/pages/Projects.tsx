import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  api, 
  WorkItemDto, 
  EmployeeDropdownDto,
  SoftwareBuildDto,
  ClientDto,
  ProductDto,
  ModuleDto,
  ClientModuleDto,
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
  Edit,
  FolderGit2,
  Layers,
  Building2,
  Component,
  RefreshCw,
  Users,
  UserPlus,
  Check
} from 'lucide-react';

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPM = user?.userType === 'ProductManager';

  // State for products list (top-level parent)
  const [productsList, setProductsList] = useState<ProductDto[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected product details & structure workspace
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);

  // Structure navigation under selected Product:
  // Structure A: Internal Modules (Product -> Module -> Requirement/Issue -> Task -> Sub-task)
  // Structure B: Client Work (Product -> Client -> Client Module -> Requirement/Bug -> Task -> Sub-task)
  const [structureTab, setStructureTab] = useState<'modules' | 'clients'>('modules');
  const [productModules, setProductModules] = useState<ModuleDto[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | 'all'>('all');

  const [productClients, setProductClients] = useState<ClientDto[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | 'all'>('all');
  const [clientModules, setClientModules] = useState<ClientModuleDto[]>([]);
  const [selectedClientModuleId, setSelectedClientModuleId] = useState<number | 'all'>('all');

  // Work items state
  const [workItems, setWorkItems] = useState<WorkItemDto[]>([]);
  const [workItemsTotalCount, setWorkItemsTotalCount] = useState(0);
  const [workItemsTotalPages, setWorkItemsTotalPages] = useState(1);
  const [workItemsLoading, setWorkItemsLoading] = useState(false);
  const [workItemSearchQuery, setWorkItemSearchQuery] = useState('');
  const [workItemStatusFilters, setWorkItemStatusFilters] = useState<string[]>([]);
  const [workItemStatusDropdownOpen, setWorkItemStatusDropdownOpen] = useState(false);
  const [workItemAssigneeFilter, setWorkItemAssigneeFilter] = useState('all');
  const [workItemDateFilter, setWorkItemDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [workItemPage, setWorkItemPage] = useState(1);
  const WORK_ITEMS_PER_PAGE = 10;

  // Export Columns state
  const [exportColumnsOptions, setExportColumnsOptions] = useState<string[]>([]);
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>([]);
  const [exportColumnsDropdownOpen, setExportColumnsDropdownOpen] = useState(false);

  // Global dropdown data
  const [allProducts, setAllProducts] = useState<ProductDto[]>([]);
  const [allClients, setAllClients] = useState<ClientDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDropdownDto[]>([]);
  const [builds, setBuilds] = useState<SoftwareBuildDto[]>([]);

  // Fixed Build Modal State
  const [showFixedBuildModal, setShowFixedBuildModal] = useState(false);
  const [pendingStatusItemId, setPendingStatusItemId] = useState<number | null>(null);
  const [pendingStatusValue, setPendingStatusValue] = useState('');
  const [selectedFixedBuild, setSelectedFixedBuild] = useState('');
  const [customFixedBuild, setCustomFixedBuild] = useState('');
  const [modalBuildOptions, setModalBuildOptions] = useState<{ buildNumber: string }[]>([]);

  // Project Members state
  const [projectMembers, setProjectMembers] = useState<EmployeeDropdownDto[]>([]);
  const [loadingProjectMembers, setLoadingProjectMembers] = useState(false);
  const [showEditMembersModal, setShowEditMembersModal] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [savingMembers, setSavingMembers] = useState(false);
  const [managingMembersForProduct, setManagingMembersForProduct] = useState<ProductDto | null>(null);

  // Modals state
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  const [showEditProduct, setShowEditProduct] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductDto | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductDesc, setEditProductDesc] = useState('');
  const [updatingProduct, setUpdatingProduct] = useState(false);

  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<ProductDto | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Hierarchy Setup Modal state
  const [showHierarchyManager, setShowHierarchyManager] = useState(false);
  const [hierarchyTab, setHierarchyTab] = useState<'products' | 'modules' | 'clients' | 'client_modules' | 'builds'>('products');
  
  // Hierarchy: Modules
  const [hierarchySelectedProductIdForModule, setHierarchySelectedProductIdForModule] = useState<number | ''>('');
  const [hierarchyModules, setHierarchyModules] = useState<ModuleDto[]>([]);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [creatingModule, setCreatingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [editModuleName, setEditModuleName] = useState('');
  const [editModuleDesc, setEditModuleDesc] = useState('');

  // Hierarchy: Clients
  const [hierarchySelectedProductIdForClient, setHierarchySelectedProductIdForClient] = useState<number | ''>('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientDesc, setNewClientDesc] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientDesc, setEditClientDesc] = useState('');

  // Hierarchy: Client Modules
  const [hierarchySelectedProductIdForClientModule, setHierarchySelectedProductIdForClientModule] = useState<number | ''>('');
  const [hierarchySelectedClientIdForClientModule, setHierarchySelectedClientIdForClientModule] = useState<number | ''>('');
  const [hierarchyClientModules, setHierarchyClientModules] = useState<ClientModuleDto[]>([]);
  const [newClientModuleName, setNewClientModuleName] = useState('');
  const [newClientModuleDesc, setNewClientModuleDesc] = useState('');
  const [creatingClientModule, setCreatingClientModule] = useState(false);
  const [editingClientModuleId, setEditingClientModuleId] = useState<number | null>(null);
  const [editClientModuleName, setEditClientModuleName] = useState('');
  const [editClientModuleDesc, setEditClientModuleDesc] = useState('');

  // Hierarchy: Builds
  const [selectedProductIdForBuild, setSelectedProductIdForBuild] = useState<number | ''>('');
  const [newBuildNumber, setNewBuildNumber] = useState('');
  const [creatingBuild, setCreatingBuild] = useState(false);
  const [editingBuildId, setEditingBuildId] = useState<number | null>(null);
  const [editBuildNumber, setEditBuildNumber] = useState('');
  const [editBuildIsActive, setEditBuildIsActive] = useState<boolean>(true);

  // Hierarchy: Products inline edit
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [inlineEditProductName, setInlineEditProductName] = useState('');
  const [inlineEditProductDesc, setInlineEditProductDesc] = useState('');

  // Unified Create Work Item Modal states
  const [showCreateFunctional, setShowCreateFunctional] = useState(false);
  const [createPath, setCreatePath] = useState<'internal' | 'client'>('internal');
  const [selectedProductIdForCreation, setSelectedProductIdForCreation] = useState<number | ''>('');
  const [modulesForCreation, setModulesForCreation] = useState<ModuleDto[]>([]);
  const [selectedModuleIdForCreation, setSelectedModuleIdForCreation] = useState<number | ''>('');
  const [clientsForCreation, setClientsForCreation] = useState<ClientDto[]>([]);
  const [selectedClientIdForCreation, setSelectedClientIdForCreation] = useState<number | ''>('');
  const [clientModulesForCreation, setClientModulesForCreation] = useState<ClientModuleDto[]>([]);
  const [selectedClientModuleIdForCreation, setSelectedClientModuleIdForCreation] = useState<number | ''>('');
  const [parentWorkItemsForCreation, setParentWorkItemsForCreation] = useState<WorkItemDto[]>([]);
  
  const [functionalWorkType, setFunctionalWorkType] = useState('Functional Requirements');
  const [functionalStatus, setFunctionalStatus] = useState('pending');
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkDesc, setNewWorkDesc] = useState('');
  const [newWorkPriority, setNewWorkPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newWorkAssignedId, setNewWorkAssignedId] = useState<number | ''>('');
  const [functionalStartDate, setFunctionalStartDate] = useState('');
  const [functionalDueDate, setFunctionalDueDate] = useState('');
  const [functionalParentId, setFunctionalParentId] = useState<number | ''>('');
  const [functionalLabel, setFunctionalLabel] = useState('');
  const [functionalTeam, setFunctionalTeam] = useState('');
  const [uploadedAttachmentUrls, setUploadedAttachmentUrls] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [buildsForCreation, setBuildsForCreation] = useState<SoftwareBuildDto[]>([]);
  const [raisedBuildForCreation, setRaisedBuildForCreation] = useState('');
  const [fixedBuildForCreation, setFixedBuildForCreation] = useState('');
  const [bugSeverity, setBugSeverity] = useState('3');
  const [bugIssueType, setBugIssueType] = useState('New');
  const [newEpicName, setNewEpicName] = useState('');
  const [newEpicColor, setNewEpicColor] = useState('purple');
  const [submissionType, setSubmissionType] = useState<'standard' | 'another' | 'copy'>('standard');
  const [workTitleError, setWorkTitleError] = useState('');
  const [productSelectError, setProductSelectError] = useState('');
  const [creatingWorkItem, setCreatingWorkItem] = useState(false);

  // Edit Task modal state
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
  const [editTaskAttachmentUrls, setEditTaskAttachmentUrls] = useState<string[]>([]);
  const [uploadingEditFiles, setUploadingEditFiles] = useState(false);
  const [savingEditTask, setSavingEditTask] = useState(false);
  const [editBuildsOptions, setEditBuildsOptions] = useState<{ buildNumber: string }[]>([]);

  // Custom Confirm Modal
  const [showHierarchyDiagramModal, setShowHierarchyDiagramModal] = useState(false);
  const [customConfirm, setCustomConfirm] = useState<{ message: string; subtext?: string; onConfirm: () => void } | null>(null);
  const showConfirm = (message: string, subtext: string, onConfirm: () => void) => {
    setCustomConfirm({ message, subtext, onConfirm });
  };

  const KANBAN_COLUMNS = [
    { id: 'assigned', title: 'ASSIGNED', color: '#1baf7a', bg: 'rgba(27, 175, 122, 0.05)', border: 'rgba(27, 175, 122, 0.2)' },
    { id: 'in_progress', title: 'IN-PROGRESS', color: '#eb6834', bg: 'rgba(235, 104, 52, 0.05)', border: 'rgba(235, 104, 52, 0.2)' },
    { id: 'completed', title: 'COMPLETED', color: '#008300', bg: 'rgba(0, 131, 0, 0.05)', border: 'rgba(0, 131, 0, 0.2)' },
    { id: 'testing_in_progress', title: 'TESTING-IN-PROGRESS', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.05)', border: 'rgba(2, 132, 199, 0.2)' },
    { id: 'bugs', title: 'BUGS', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', border: 'rgba(239, 68, 68, 0.2)' },
    { id: 'open', title: 'OPEN', color: '#e34948', bg: 'rgba(227, 73, 72, 0.05)', border: 'rgba(227, 73, 72, 0.2)' },
    { id: 'fixed', title: 'FIXED', color: '#eda100', bg: 'rgba(237, 161, 0, 0.05)', border: 'rgba(237, 161, 0, 0.2)' },
    { id: 'reopen', title: 'RE-OPEN', color: '#e87ba4', bg: 'rgba(232, 123, 164, 0.05)', border: 'rgba(232, 123, 164, 0.2)' },
    { id: 'testing_completed', title: 'TESTING COMPLETED', color: '#10b981', bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.2)' },
    { id: 'released', title: 'RELEASED', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.05)', border: 'rgba(139, 92, 246, 0.2)' }
  ];

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------
  const fetchProducts = async () => {
    setProductsLoading(true);
    setError('');
    try {
      const res = await api.getAllProducts();
      if (res.success) {
        setProductsList(res.data);
        setAllProducts(res.data);
      } else {
        setError(res.message || 'Failed to load products');
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err.message || 'Error fetching products. Please ensure the backend server is running.');
    } finally {
      setProductsLoading(false);
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.getEmployeesDropdown();
      if (res.success) setEmployees(res.data);
    } catch (_) {}
  };

  const fetchClients = async () => {
    try {
      const res = await api.getClients();
      if (res.success) setAllClients(res.data);
    } catch (_) {}
  };

  const fetchExportColumns = async () => {
    try {
      const res = await api.getExportColumns();
      if (res.success) setExportColumnsOptions(res.data);
    } catch (_) {}
  };

  const fetchProjectMembers = async (projectId: number) => {
    setLoadingProjectMembers(true);
    try {
      const res = await api.getProjectById(projectId);
      if (res.success && res.data) {
        setProjectMembers(res.data.assignedEmployees || []);
      } else {
        setProjectMembers([]);
      }
    } catch (err) {
      console.error('Failed to load project members:', err);
      setProjectMembers([]);
    } finally {
      setLoadingProjectMembers(false);
    }
  };

  const handleOpenMembersModal = async (product: ProductDto) => {
    setManagingMembersForProduct(product);
    const targetId = product.projectId || product.id;
    setLoadingProjectMembers(true);
    setShowEditMembersModal(true);
    setMemberSearchQuery('');
    try {
      const res = await api.getProjectById(targetId);
      if (res.success && res.data) {
        const members = res.data.assignedEmployees || [];
        if (selectedProduct && selectedProduct.id === product.id) {
          setProjectMembers(members);
        }
        setSelectedMemberIds(members.map(m => m.id));
      } else {
        setSelectedMemberIds([]);
      }
    } catch {
      setSelectedMemberIds([]);
    } finally {
      setLoadingProjectMembers(false);
    }
  };

  const handleSaveProjectMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = managingMembersForProduct || selectedProduct;
    if (!prod) return;
    setSavingMembers(true);
    try {
      const targetId = prod.projectId || prod.id;
      const res = await api.updateProjectMembers(targetId, selectedMemberIds);
      if (res.success) {
        if (selectedProduct && selectedProduct.id === prod.id) {
          setProjectMembers(res.data.assignedEmployees || []);
        }
        setShowEditMembersModal(false);
        toast.success(`Project members for "${prod.name}" updated successfully!`);
      } else {
        toast.error(res.message || 'Failed to update members');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update members');
    } finally {
      setSavingMembers(false);
    }
  };

  // Load modules & clients for a selected product
  const loadProductDetails = async (product: ProductDto) => {
    setSelectedProduct(product);
    setWorkItemPage(1);
    setSelectedModuleId('all');
    setSelectedClientId('all');
    setSelectedClientModuleId('all');
    fetchProjectMembers(product.projectId || product.id);
    try {
      const [modulesRes, clientsRes, buildsRes] = await Promise.all([
        api.getModules(product.id),
        api.getClientsByProduct(product.id),
        api.getBuildsByProject(product.projectId || product.id).catch(() => ({ success: false, data: [] }))
      ]);
      if (modulesRes.success) setProductModules(modulesRes.data);
      if (clientsRes.success) setProductClients(clientsRes.data);
      if (buildsRes.success) setBuilds(buildsRes.data);
    } catch (err) {
      console.error('Error loading product details:', err);
    }
  };

  // Fetch work items under the selected product + structure path
  const fetchWorkItems = async () => {
    if (!selectedProduct) return;
    setWorkItemsLoading(true);
    try {
      const params: any = {
        productId: selectedProduct.id,
        page: workItemPage,
        pageSize: WORK_ITEMS_PER_PAGE,
        status: workItemStatusFilters.length > 0 ? workItemStatusFilters.join(',') : undefined,
        search: workItemSearchQuery || undefined,
        assignedTo: workItemAssigneeFilter !== 'all' ? workItemAssigneeFilter : undefined,
        dueDate: workItemDateFilter || undefined
      };

      if (structureTab === 'modules') {
        if (selectedModuleId !== 'all') {
          params.moduleId = selectedModuleId;
        }
      } else if (structureTab === 'clients') {
        if (selectedClientModuleId !== 'all') {
          params.clientModuleId = selectedClientModuleId;
        }
      }

      const res = await api.getWorkItemsByParentPaged(params);
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

  // When selectedClientId changes in Structure B, load its client modules
  useEffect(() => {
    if (structureTab === 'clients' && selectedClientId !== 'all') {
      api.getClientModules(Number(selectedClientId)).then(res => {
        if (res.success) setClientModules(res.data);
      }).catch(() => setClientModules([]));
    } else {
      setClientModules([]);
    }
  }, [structureTab, selectedClientId]);

  // Debounced search queries
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const debouncedWorkItemSearchQuery = useDebounce(workItemSearchQuery, 400);

  useEffect(() => {
    fetchProducts();
    fetchEmployees();
    fetchClients();
    fetchExportColumns();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchWorkItems();
    }
  }, [
    selectedProduct?.id,
    structureTab,
    selectedModuleId,
    selectedClientId,
    selectedClientModuleId,
    workItemPage,
    workItemStatusFilters,
    debouncedWorkItemSearchQuery,
    workItemAssigneeFilter,
    workItemDateFilter
  ]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setWorkItemPage(1);
  }, [structureTab, selectedModuleId, selectedClientId, selectedClientModuleId, debouncedWorkItemSearchQuery, workItemStatusFilters, workItemAssigneeFilter, workItemDateFilter]);

  // --------------------------------------------------------------------------
  // Drag & Drop & Inline updates for Work Items
  // --------------------------------------------------------------------------
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
    if (!selectedProduct) return;

    const item = workItems.find(w => w.id === itemId);
    if (!item || item.status === newStatus) return;

    if (newStatus === 'fixed' || newStatus === 'completed' || newStatus === 'testing_completed' || newStatus === 'released') {
      setPendingStatusItemId(itemId);
      setPendingStatusValue(newStatus);
      setSelectedFixedBuild('');
      setModalBuildOptions([]);
      
      setWorkItems(prev => prev.map(w => w.id === itemId ? { ...w, status: newStatus as any } : w));

      try {
        const buildsRes = await api.getBuildsByProject(item.projectId || selectedProduct.projectId || selectedProduct.id);
        if (buildsRes.success) {
          setModalBuildOptions(buildsRes.data);
          if (buildsRes.data.length > 0) setSelectedFixedBuild(buildsRes.data[0].buildNumber);
        }
      } catch (_) {}
      
      setShowFixedBuildModal(true);
      return;
    }

    const updatedWorkItems = workItems.map(w => w.id === itemId ? { ...w, status: newStatus as any } : w);
    setWorkItems(updatedWorkItems);

    try {
      const res = await api.updateWorkItemStatus(itemId, { status: newStatus });
      if (res.success) {
        toast.success('Task status updated!');
      } else {
        toast.error(res.message || 'Failed to update task status');
        fetchWorkItems();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating task status');
      fetchWorkItems();
    }
  };

  const handleInlineStatusChange = async (itemId: number, newStatus: string) => {
    const item = workItems.find(w => w.id === itemId);
    if (!item || item.status === newStatus || !selectedProduct) return;

    if (newStatus === 'fixed' || newStatus === 'completed' || newStatus === 'testing_completed' || newStatus === 'released') {
      setPendingStatusItemId(itemId);
      setPendingStatusValue(newStatus);
      setSelectedFixedBuild('');
      setModalBuildOptions([]);
      setWorkItems(prev => prev.map(w => w.id === itemId ? { ...w, status: newStatus as any } : w));

      try {
        const buildsRes = await api.getBuildsByProject(item.projectId || selectedProduct.projectId || selectedProduct.id);
        if (buildsRes.success) {
          setModalBuildOptions(buildsRes.data);
          if (buildsRes.data.length > 0) setSelectedFixedBuild(buildsRes.data[0].buildNumber);
        }
      } catch (_) {}
      
      setShowFixedBuildModal(true);
      return;
    }

    setWorkItems(prev => prev.map(w => w.id === itemId ? { ...w, status: newStatus as any } : w));
    try {
      const res = await api.updateWorkItemStatus(itemId, { status: newStatus });
      if (res.success) {
        toast.success('Task status updated!');
      } else {
        toast.error(res.message || 'Failed to update task status');
        fetchWorkItems();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating task status');
      fetchWorkItems();
    }
  };

  const handleInlineDueDateChange = async (itemId: number, newDate: string) => {
    if (!selectedProduct) return;
    setWorkItems(prev => prev.map(w => w.id === itemId ? { ...w, dueDate: newDate || null } : w));
    try {
      const res = await api.updateWorkItemDueDate(itemId, newDate || null);
      if (res.success) {
        toast.success('Due date updated!');
      } else {
        toast.error(res.message || 'Failed to update due date');
        fetchWorkItems();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating due date');
      fetchWorkItems();
    }
  };

  const handleInlineAssigneeChange = async (itemId: number, newAssigneeId: number | '') => {
    if (!selectedProduct) return;
    const assignedEmployee = employees.find(e => e.id === newAssigneeId);
    setWorkItems(prev => prev.map(w =>
      w.id === itemId
        ? { ...w, assignedToUserId: newAssigneeId === '' ? null : Number(newAssigneeId), assignedTo: newAssigneeId === '' ? undefined : (assignedEmployee?.name || w.assignedTo) }
        : w
    ));

    try {
      const res = await api.reassignWorkItem(itemId, newAssigneeId === '' ? null : Number(newAssigneeId));
      if (res.success) {
        toast.success('Task reassigned!');
        fetchWorkItems();
      } else {
        toast.error(res.message || 'Failed to reassign task');
        fetchWorkItems();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error reassigning task');
      fetchWorkItems();
    }
  };

  const handleConfirmFixedBuild = async () => {
    if (!selectedProduct || !pendingStatusItemId || !pendingStatusValue) return;
    const itemId = pendingStatusItemId;
    const newStatus = pendingStatusValue;
    const fixedBuildVal = (customFixedBuild.trim() || selectedFixedBuild.trim()) || undefined;

    setShowFixedBuildModal(false);
    setWorkItems(prev => prev.map(w =>
      w.id === itemId ? { ...w, status: newStatus as any, fixedBuild: fixedBuildVal || w.fixedBuild } : w
    ));

    try {
      const res = await api.updateWorkItemStatus(itemId, {
        status: newStatus,
        fixedBuild: fixedBuildVal
      });
      if (res.success) {
        toast.success('Task status updated!');
        fetchWorkItems();
      } else {
        toast.error(res.message || 'Failed to update task status');
        fetchWorkItems();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating task status');
      fetchWorkItems();
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
    if (selectedProduct) fetchWorkItems();
    setPendingStatusItemId(null);
    setPendingStatusValue('');
    setSelectedFixedBuild('');
    setCustomFixedBuild('');
    setModalBuildOptions([]);
  };

  // --------------------------------------------------------------------------
  // Product Creation & Updates
  // --------------------------------------------------------------------------
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      toast.error('Product name is required');
      return;
    }
    setCreatingProduct(true);
    try {
      const res = await api.createProduct(newProductName.trim(), newProductDesc || undefined);
      if (res.success) {
        toast.success('Product created successfully!');
        setNewProductName('');
        setNewProductDesc('');
        setShowCreateProduct(false);
        fetchProducts();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productToEdit || !editProductName.trim()) {
      toast.error('Product name is required');
      return;
    }
    setUpdatingProduct(true);
    try {
      const res = await api.updateProduct(productToEdit.id, editProductName.trim(), editProductDesc || undefined, productToEdit.projectId || undefined);
      if (res.success) {
        toast.success('Product updated successfully!');
        if (selectedProduct && selectedProduct.id === productToEdit.id) {
          setSelectedProduct(res.data);
        }
        setShowEditProduct(false);
        setProductToEdit(null);
        fetchProducts();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update product');
    } finally {
      setUpdatingProduct(false);
    }
  };

  const handleDeleteProduct = async (product: ProductDto) => {
    showConfirm(
      'Delete Product?',
      `Are you sure you want to delete ${product.name} (${product.productNumber})? This will cascade to its modules.`,
      async () => {
        try {
          const res = await api.deleteProduct(product.id);
          if (res.success) {
            toast.success('Product deleted successfully!');
            if (selectedProduct?.id === product.id) setSelectedProduct(null);
            fetchProducts();
          } else {
            toast.error(res.message);
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete product');
        }
      }
    );
  };

  // --------------------------------------------------------------------------
  // Hierarchy Management Helpers (CRUD)
  // --------------------------------------------------------------------------
  const handleCreateModuleInHierarchy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hierarchySelectedProductIdForModule) {
      toast.error('Please select a product');
      return;
    }
    if (!newModuleName.trim()) {
      toast.error('Module name is required');
      return;
    }
    setCreatingModule(true);
    try {
      const res = await api.createModule(newModuleName.trim(), newModuleDesc || undefined, Number(hierarchySelectedProductIdForModule));
      if (res.success) {
        toast.success('Module created successfully!');
        setNewModuleName('');
        setNewModuleDesc('');
        const modRes = await api.getModules(Number(hierarchySelectedProductIdForModule));
        if (modRes.success) setHierarchyModules(modRes.data);
        if (selectedProduct?.id === Number(hierarchySelectedProductIdForModule)) {
          setProductModules(modRes.data);
        }
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating module');
    } finally {
      setCreatingModule(false);
    }
  };

  const handleSaveModuleEdit = async (moduleId: number) => {
    if (!editModuleName.trim() || !hierarchySelectedProductIdForModule) return;
    try {
      const res = await api.updateModule(moduleId, editModuleName.trim(), editModuleDesc || undefined, Number(hierarchySelectedProductIdForModule));
      if (res.success) {
        toast.success('Module updated!');
        setEditingModuleId(null);
        const modRes = await api.getModules(Number(hierarchySelectedProductIdForModule));
        if (modRes.success) setHierarchyModules(modRes.data);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update module');
    }
  };

  const handleDeleteModuleInHierarchy = async (moduleId: number) => {
    showConfirm(
      'Delete Module?',
      'Associated work items will have their module unassigned.',
      async () => {
        try {
          const res = await api.deleteModule(moduleId);
          if (res.success) {
            toast.success('Module deleted!');
            if (hierarchySelectedProductIdForModule) {
              const modRes = await api.getModules(Number(hierarchySelectedProductIdForModule));
              if (modRes.success) setHierarchyModules(modRes.data);
            }
          } else {
            toast.error(res.message);
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete module');
        }
      }
    );
  };

  const handleCreateClientInHierarchy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    setCreatingClient(true);
    try {
      const prodId = hierarchySelectedProductIdForClient === '' ? undefined : Number(hierarchySelectedProductIdForClient);
      const res = await api.createClient(newClientName.trim(), newClientDesc || undefined, prodId);
      if (res.success) {
        toast.success('Client created successfully!');
        setNewClientName('');
        setNewClientDesc('');
        fetchClients();
        if (selectedProduct && selectedProduct.id === prodId) {
          api.getClientsByProduct(selectedProduct.id).then(r => r.success && setProductClients(r.data));
        }
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating client');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSaveClientEdit = async (clientId: number) => {
    if (!editClientName.trim()) return;
    try {
      const prodId = hierarchySelectedProductIdForClient === '' ? undefined : Number(hierarchySelectedProductIdForClient);
      const res = await api.updateClient(clientId, editClientName.trim(), editClientDesc || undefined, prodId);
      if (res.success) {
        toast.success('Client updated!');
        setEditingClientId(null);
        fetchClients();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update client');
    }
  };

  const handleDeleteClientInHierarchy = async (clientId: number) => {
    showConfirm(
      'Delete Client?',
      'Associated projects and client modules will have client unassigned.',
      async () => {
        try {
          const res = await api.deleteClient(clientId);
          if (res.success) {
            toast.success('Client deleted!');
            fetchClients();
          } else {
            toast.error(res.message);
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete client');
        }
      }
    );
  };

  const handleCreateClientModuleInHierarchy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hierarchySelectedClientIdForClientModule) {
      toast.error('Please select a client');
      return;
    }
    if (!newClientModuleName.trim()) {
      toast.error('Client Module name is required');
      return;
    }
    setCreatingClientModule(true);
    try {
      const res = await api.createClientModule(newClientModuleName.trim(), Number(hierarchySelectedClientIdForClientModule), newClientModuleDesc || undefined);
      if (res.success) {
        toast.success('Client Module created successfully!');
        setNewClientModuleName('');
        setNewClientModuleDesc('');
        const cmRes = await api.getClientModules(Number(hierarchySelectedClientIdForClientModule));
        if (cmRes.success) setHierarchyClientModules(cmRes.data);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating client module');
    } finally {
      setCreatingClientModule(false);
    }
  };

  const handleSaveClientModuleEdit = async (clientModuleId: number) => {
    if (!editClientModuleName.trim() || !hierarchySelectedClientIdForClientModule) return;
    try {
      const res = await api.updateClientModule(clientModuleId, editClientModuleName.trim(), Number(hierarchySelectedClientIdForClientModule), editClientModuleDesc || undefined);
      if (res.success) {
        toast.success('Client Module updated!');
        setEditingClientModuleId(null);
        const cmRes = await api.getClientModules(Number(hierarchySelectedClientIdForClientModule));
        if (cmRes.success) setHierarchyClientModules(cmRes.data);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update client module');
    }
  };

  const handleDeleteClientModuleInHierarchy = async (clientModuleId: number) => {
    showConfirm(
      'Delete Client Module?',
      'Associated work items will have client module unassigned.',
      async () => {
        try {
          const res = await api.deleteClientModule(clientModuleId);
          if (res.success) {
            toast.success('Client Module deleted!');
            if (hierarchySelectedClientIdForClientModule) {
              const cmRes = await api.getClientModules(Number(hierarchySelectedClientIdForClientModule));
              if (cmRes.success) setHierarchyClientModules(cmRes.data);
            }
          } else {
            toast.error(res.message);
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete client module');
        }
      }
    );
  };

  // --------------------------------------------------------------------------
  // Work Item Creation Handler (Supports Structure A and Structure B)
  // --------------------------------------------------------------------------
  const handleOpenCreateModal = async (initialPath: 'internal' | 'client' = 'internal') => {
    setCreatePath(initialPath);
    setWorkTitleError('');
    setProductSelectError('');
    setNewWorkTitle('');
    setNewWorkDesc('');
    setNewWorkPriority('medium');
    setFunctionalStatus('assigned');
    setFunctionalWorkType('Functional Requirements');
    setNewWorkAssignedId('');
    setFunctionalStartDate('');
    setFunctionalDueDate('');
    setFunctionalParentId('');
    setFunctionalLabel('');
    setFunctionalTeam('');
    setRaisedBuildForCreation('');
    setFixedBuildForCreation('');
    setUploadedAttachmentUrls([]);

    const prodId = selectedProduct ? selectedProduct.id : (allProducts.length > 0 ? allProducts[0].id : '');
    setSelectedProductIdForCreation(prodId);

    if (prodId) {
      try {
        const [modRes, clientRes, buildsRes] = await Promise.all([
          api.getModules(Number(prodId)),
          api.getClientsByProduct(Number(prodId)),
          api.getBuildsByProject(selectedProduct?.projectId || Number(prodId)).catch(() => ({ success: false, data: [] }))
        ]);
        if (modRes.success) {
          setModulesForCreation(modRes.data);
          if (selectedModuleId !== 'all') {
            setSelectedModuleIdForCreation(selectedModuleId);
          } else if (modRes.data.length > 0) {
            setSelectedModuleIdForCreation(modRes.data[0].id);
          } else {
            setSelectedModuleIdForCreation('');
          }
        }
        if (clientRes.success) {
          setClientsForCreation(clientRes.data);
          if (selectedClientId !== 'all') {
            setSelectedClientIdForCreation(selectedClientId);
            const cmRes = await api.getClientModules(Number(selectedClientId));
            if (cmRes.success) {
              setClientModulesForCreation(cmRes.data);
              if (selectedClientModuleId !== 'all') {
                setSelectedClientModuleIdForCreation(selectedClientModuleId);
              } else if (cmRes.data.length > 0) {
                setSelectedClientModuleIdForCreation(cmRes.data[0].id);
              }
            }
          } else if (clientRes.data.length > 0) {
            setSelectedClientIdForCreation(clientRes.data[0].id);
            const cmRes = await api.getClientModules(clientRes.data[0].id);
            if (cmRes.success) {
              setClientModulesForCreation(cmRes.data);
              if (cmRes.data.length > 0) setSelectedClientModuleIdForCreation(cmRes.data[0].id);
            }
          }
        }
        if (buildsRes.success) setBuildsForCreation(buildsRes.data);
      } catch (_) {}
    }

    setShowCreateFunctional(true);
  };

  const handleProductChangeInCreation = async (prodId: number | '') => {
    setSelectedProductIdForCreation(prodId);
    setSelectedModuleIdForCreation('');
    setSelectedClientIdForCreation('');
    setSelectedClientModuleIdForCreation('');
    setModulesForCreation([]);
    setClientsForCreation([]);
    setClientModulesForCreation([]);
    setParentWorkItemsForCreation([]);
    if (!prodId) return;

    try {
      const [modRes, clientRes] = await Promise.all([
        api.getModules(Number(prodId)),
        api.getClientsByProduct(Number(prodId))
      ]);
      if (modRes.success) {
        setModulesForCreation(modRes.data);
        if (modRes.data.length > 0) setSelectedModuleIdForCreation(modRes.data[0].id);
      }
      if (clientRes.success) {
        setClientsForCreation(clientRes.data);
        if (clientRes.data.length > 0) {
          setSelectedClientIdForCreation(clientRes.data[0].id);
          const cmRes = await api.getClientModules(clientRes.data[0].id);
          if (cmRes.success) {
            setClientModulesForCreation(cmRes.data);
            if (cmRes.data.length > 0) setSelectedClientModuleIdForCreation(cmRes.data[0].id);
          }
        }
      }
    } catch (_) {}
  };

  const handleClientChangeInCreation = async (clientId: number | '') => {
    setSelectedClientIdForCreation(clientId);
    setSelectedClientModuleIdForCreation('');
    setClientModulesForCreation([]);
    if (!clientId) return;
    try {
      const cmRes = await api.getClientModules(Number(clientId));
      if (cmRes.success) {
        setClientModulesForCreation(cmRes.data);
        if (cmRes.data.length > 0) setSelectedClientModuleIdForCreation(cmRes.data[0].id);
      }
    } catch (_) {}
  };

  // Load parent candidates when module or client module changes
  useEffect(() => {
    if (!showCreateFunctional) return;
    const fetchParents = async () => {
      try {
        const params: any = {
          productId: selectedProductIdForCreation ? Number(selectedProductIdForCreation) : undefined
        };
        if (createPath === 'internal' && selectedModuleIdForCreation) {
          params.moduleId = Number(selectedModuleIdForCreation);
        } else if (createPath === 'client' && selectedClientModuleIdForCreation) {
          params.clientModuleId = Number(selectedClientModuleIdForCreation);
        }
        const res = await api.getWorkItemsByParent(params);
        if (res.success) {
          setParentWorkItemsForCreation(res.data.filter(w => w.workType !== 'Sub-task'));
        }
      } catch (_) {}
    };
    fetchParents();
  }, [showCreateFunctional, createPath, selectedProductIdForCreation, selectedModuleIdForCreation, selectedClientModuleIdForCreation]);

  const handleCreateWorkItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkTitleError('');
    setProductSelectError('');

    if (!selectedProductIdForCreation) {
      setProductSelectError('Product is required');
      return;
    }
    if (!newWorkTitle.trim()) {
      setWorkTitleError('Summary is required');
      return;
    }

    setCreatingWorkItem(true);
    try {
      const body: any = {
        title: newWorkTitle.trim(),
        description: newWorkDesc.trim() || null,
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
        productId: Number(selectedProductIdForCreation),
        moduleId: createPath === 'internal' && selectedModuleIdForCreation !== '' ? Number(selectedModuleIdForCreation) : null,
        clientModuleId: createPath === 'client' && selectedClientModuleIdForCreation !== '' ? Number(selectedClientModuleIdForCreation) : null,
        clientId: createPath === 'client' && selectedClientIdForCreation !== '' ? Number(selectedClientIdForCreation) : null,
        epicName: functionalWorkType === 'Epic' ? newEpicName || newWorkTitle : null,
        epicColor: functionalWorkType === 'Epic' ? newEpicColor : null,
        severity: functionalWorkType === 'Bug' ? bugSeverity : null,
        issueType: functionalWorkType === 'Bug' ? bugIssueType : null,
        raisedBuild: raisedBuildForCreation || null,
        fixedBuild: fixedBuildForCreation || null
      };

      const res = await api.createWorkItemDirect(body);
      if (res.success) {
        toast.success('Work item created successfully!');
        if (selectedProduct && selectedProduct.id === Number(selectedProductIdForCreation)) {
          setWorkItemPage(1);
          fetchWorkItems();
        }

        if (submissionType === 'another') {
          setNewWorkTitle('');
          setNewWorkDesc('');
          setUploadedAttachmentUrls([]);
        } else if (submissionType === 'copy') {
          toast.info('Form preserved. Modify and create your copy.');
        } else {
          setShowCreateFunctional(false);
        }
      } else {
        toast.error(res.message || 'Failed to create work item');
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

  // --------------------------------------------------------------------------
  // Edit & Delete Task Handlers
  // --------------------------------------------------------------------------
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
    setEditTaskAttachmentUrls(item.attachmentUrls ? item.attachmentUrls.split(',').filter(Boolean) : []);
    
    if (selectedProduct) {
      try {
        const buildsRes = await api.getBuildsByProject(item.projectId || selectedProduct.projectId || selectedProduct.id);
        if (buildsRes.success) setEditBuildsOptions(buildsRes.data);
      } catch (_) {}
    }
    setShowEditTask(true);
  };

  const handleEditTaskAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingEditFiles(true);
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
      setEditTaskAttachmentUrls(prev => [...prev, ...urls]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload attachments');
    } finally {
      setUploadingEditFiles(false);
    }
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkItem || !selectedProduct) return;
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
        attachmentUrls: editTaskAttachmentUrls.join(',') || null,
        moduleId: editingWorkItem.moduleId || null,
        clientModuleId: editingWorkItem.clientModuleId || null
      });
      if (res.success) {
        toast.success('Task updated successfully!');
        setShowEditTask(false);
        fetchWorkItems();
      } else {
        toast.error(res.message || 'Failed to update task');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task');
    } finally {
      setSavingEditTask(false);
    }
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
            fetchWorkItems();
          } else {
            toast.error(res.message);
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete task');
        }
      }
    );
  };

  // --------------------------------------------------------------------------
  // Badges & UI Helpers
  // --------------------------------------------------------------------------
  const filteredProducts = productsList.filter(p =>
    p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    p.productNumber.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
  );

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
    '6': { bg: 'rgba(220,38,38,0.25)',   border: 'rgba(220,38,38,0.45)',  text: '#ef4444' }
  };

  const renderSeverityBadge = (severity?: string | null) => {
    if (!severity) return null;
    const key = severity.toLowerCase();
    const c = SEVERITY_COLOR_MAP[key] || SEVERITY_COLOR_MAP['3'];
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: c.bg, border: `1px solid ${c.border}`, color: c.text, whiteSpace: 'nowrap' }}>
        Severity {key}
      </span>
    );
  };

  // --------------------------------------------------------------------------
  // Main Render
  // --------------------------------------------------------------------------
  return (
    <div>
      {/* =====================================================================
          SELECTED PRODUCT WORKSPACE VIEW
          ===================================================================== */}
      {selectedProduct ? (
        <div>
          {/* Back breadcrumb */}
          <div style={{ marginBottom: '20px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => { 
                setSelectedProduct(null); 
                setWorkItemSearchQuery(''); 
                setWorkItemStatusFilters([]); 
                setWorkItemAssigneeFilter('all');
                setWorkItemDateFilter('');
              }}
              style={{ padding: '8px 16px' }}
            >
              ← Back to Products
            </button>
          </div>

          {/* Product Details Header Panel */}
          <div className="glass-panel" style={{ padding: '30px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className="badge badge-testing" style={{ fontSize: '0.8rem' }}>{selectedProduct.productNumber}</span>
                  {selectedProduct.projectName && (
                    <span className="badge" style={{ fontSize: '0.8rem', background: 'rgba(56, 189, 248, 0.15)', color: '#0ea5e9', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      Project: {selectedProduct.projectName}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, wordBreak: 'break-word' }}>{selectedProduct.name}</h1>
                  {isPM && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => {
                          setProductToEdit(selectedProduct);
                          setEditProductName(selectedProduct.name);
                          setEditProductDesc(selectedProduct.description || '');
                          setShowEditProduct(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem', height: 'fit-content' }}
                      >
                        Edit Product
                      </button>
                      <button 
                        onClick={() => {
                          setHierarchySelectedProductIdForModule(selectedProduct.id);
                          setHierarchySelectedProductIdForClient(selectedProduct.id);
                          setHierarchySelectedProductIdForClientModule(selectedProduct.id);
                          setShowHierarchyManager(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem', height: 'fit-content' }}
                      >
                        Hierarchy Setup
                      </button>
                      {isPM && (
                        <button 
                          onClick={() => handleOpenMembersModal(selectedProduct)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem', height: 'fit-content', display: 'flex', alignItems: 'center', gap: '5px' }}
                          title="Manage employee access and members for this project"
                        >
                          <Users size={14} />
                          <span>Manage Members ({projectMembers.length})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '800px', lineHeight: 1.6, margin: 0 }}>
                  {selectedProduct.description || 'No description provided for this product.'}
                </p>
              </div>

              <div style={{ background: 'rgba(139, 122, 208, 0.05)', padding: '16px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', marginBottom: '8px' }}>
                  <Layers size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Modules:</span>
                  <span style={{ fontWeight: 600 }}>{productModules.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', marginBottom: '8px' }}>
                  <Building2 size={16} style={{ color: 'var(--secondary)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Clients:</span>
                  <span style={{ fontWeight: 600 }}>{productClients.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', marginBottom: '8px' }}>
                  <Users size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Members:</span>
                  <span style={{ fontWeight: 600 }}>{projectMembers.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                  <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Created:</span>
                  <span style={{ fontWeight: 600 }}>{new Date(selectedProduct.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Assigned Team Members Bar */}
            <div style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} style={{ color: 'var(--primary)' }} />
                  Assigned Team ({projectMembers.length}):
                </span>
                {loadingProjectMembers ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading members...</span>
                ) : projectMembers.length === 0 ? (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No employees assigned yet. Click "Manage Members" to add employees.
                  </span>
                ) : (
                  projectMembers.map(emp => (
                    <span
                      key={emp.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 10px',
                        borderRadius: '16px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary)',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                      }}
                      title={emp.email}
                    >
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800
                      }}>
                        {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                      </span>
                      {emp.name}
                    </span>
                  ))
                )}
              </div>
              {isPM && (
                <button
                  type="button"
                  onClick={() => handleOpenMembersModal(selectedProduct)}
                  className="btn btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <UserPlus size={13} />
                  <span>+ Add / Change Members</span>
                </button>
              )}
            </div>
          </div>

          {/* ===================================================================
              STRUCTURE A / STRUCTURE B NAVIGATION BAR
              =================================================================== */}
          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className={`btn ${structureTab === 'modules' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStructureTab('modules')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  <Layers size={16} />
                  <span>Structure A: Internal Modules</span>
                </button>
                <button
                  type="button"
                  className={`btn ${structureTab === 'clients' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStructureTab('clients')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  <Building2 size={16} />
                  <span>Structure B: Client Work</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleOpenCreateModal(structureTab === 'modules' ? 'internal' : 'client')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <PlusCircle size={16} />
                  <span>Create Work Item</span>
                </button>
              </div>
            </div>

            {/* Path Details and Secondary Pill Bar */}
            {structureTab === 'modules' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Product Modules (Core System Hierarchy: Product → Module → Requirement/Issue → Task → Sub-task)
                  </span>
                  {isPM && (
                    <button
                      type="button"
                      onClick={() => {
                        setHierarchyTab('modules');
                        setHierarchySelectedProductIdForModule(selectedProduct.id);
                        api.getModules(selectedProduct.id).then(r => r.success && setHierarchyModules(r.data));
                        setShowHierarchyManager(true);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      + Add Module
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedModuleId('all')}
                    className={`badge ${selectedModuleId === 'all' ? 'badge-completed' : ''}`}
                    style={{
                      cursor: 'pointer',
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      background: selectedModuleId === 'all' ? 'var(--primary)' : 'rgba(148, 163, 184, 0.1)',
                      color: selectedModuleId === 'all' ? '#fff' : 'var(--text-primary)',
                      border: '1px solid var(--border-soft)'
                    }}
                  >
                    All Modules ({productModules.length})
                  </button>
                  {productModules.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModuleId(m.id)}
                      className="badge"
                      style={{
                        cursor: 'pointer',
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                        background: selectedModuleId === m.id ? 'var(--primary)' : '#ffffff',
                        color: selectedModuleId === m.id ? '#ffffff' : 'var(--text-primary)',
                        border: selectedModuleId === m.id ? '1px solid var(--primary)' : '1px solid var(--border-soft)'
                      }}
                    >
                      {m.name} <span style={{ opacity: 0.7, fontSize: '0.75rem', marginLeft: '4px' }}>({m.moduleNumber})</span>
                    </button>
                  ))}
                  {productModules.length === 0 && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No modules created yet. Click "+ Add Module" to create one.</span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Client Implementations (Hierarchy: Product → Client → Client Module → Bug/Requirement → Task → Sub-task)
                  </span>
                  {isPM && (
                    <button
                      type="button"
                      onClick={() => {
                        setHierarchyTab('clients');
                        setHierarchySelectedProductIdForClient(selectedProduct.id);
                        setShowHierarchyManager(true);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      + Add Client
                    </button>
                  )}
                </div>
                {/* Client Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => { setSelectedClientId('all'); setSelectedClientModuleId('all'); }}
                    className="badge"
                    style={{
                      cursor: 'pointer',
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      background: selectedClientId === 'all' ? '#0ea5e9' : 'rgba(148, 163, 184, 0.1)',
                      color: selectedClientId === 'all' ? '#fff' : 'var(--text-primary)',
                      border: '1px solid var(--border-soft)'
                    }}
                  >
                    All Clients ({productClients.length})
                  </button>
                  {productClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedClientId(c.id); setSelectedClientModuleId('all'); }}
                      className="badge"
                      style={{
                        cursor: 'pointer',
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                        background: selectedClientId === c.id ? '#0ea5e9' : '#ffffff',
                        color: selectedClientId === c.id ? '#ffffff' : 'var(--text-primary)',
                        border: selectedClientId === c.id ? '1px solid #0ea5e9' : '1px solid var(--border-soft)'
                      }}
                    >
                      {c.name} <span style={{ opacity: 0.7, fontSize: '0.75rem', marginLeft: '4px' }}>({c.clientNumber})</span>
                    </button>
                  ))}
                  {productClients.length === 0 && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No clients linked to this product yet. Click "+ Add Client" to link one.</span>
                  )}
                </div>

                {/* Client Modules Sub-Pills (visible when a specific client is selected) */}
                {selectedClientId !== 'all' && (
                  <div style={{ background: 'rgba(14, 165, 233, 0.05)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1' }}>
                        Client Modules for {productClients.find(c => c.id === selectedClientId)?.name}:
                      </span>
                      {isPM && (
                        <button
                          type="button"
                          onClick={() => {
                            setHierarchyTab('client_modules');
                            setHierarchySelectedProductIdForClientModule(selectedProduct.id);
                            setHierarchySelectedClientIdForClientModule(selectedClientId);
                            api.getClientModules(Number(selectedClientId)).then(r => r.success && setHierarchyClientModules(r.data));
                            setShowHierarchyManager(true);
                          }}
                          style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          + Add Client Module
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedClientModuleId('all')}
                        className="badge"
                        style={{
                          cursor: 'pointer',
                          padding: '4px 10px',
                          fontSize: '0.78rem',
                          background: selectedClientModuleId === 'all' ? '#0284c7' : '#ffffff',
                          color: selectedClientModuleId === 'all' ? '#ffffff' : '#0369a1',
                          border: '1px solid rgba(14, 165, 233, 0.3)'
                        }}
                      >
                        All Client Modules ({clientModules.length})
                      </button>
                      {clientModules.map(cm => (
                        <button
                          key={cm.id}
                          type="button"
                          onClick={() => setSelectedClientModuleId(cm.id)}
                          className="badge"
                          style={{
                            cursor: 'pointer',
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            background: selectedClientModuleId === cm.id ? '#0284c7' : '#ffffff',
                            color: selectedClientModuleId === cm.id ? '#ffffff' : '#0369a1',
                            border: selectedClientModuleId === cm.id ? '1px solid #0284c7' : '1px solid rgba(14, 165, 233, 0.3)'
                          }}
                        >
                          {cm.name} <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: '3px' }}>({cm.clientModuleNumber})</span>
                        </button>
                      ))}
                      {clientModules.length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No client modules for this client. Click "+ Add Client Module" to create one.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===================================================================
              WORK ITEMS LIST / KANBAN HEADER & FILTERS
              =================================================================== */}
          <div className="page-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0' }}>Work Items</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                {structureTab === 'modules' ? 'Tasks, requirements, and issues under internal modules.' : 'Tasks, bugs, and requirements under client modules.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
            </div>
          </div>

          {/* Filters Bar */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '250px' }}>
              <Search size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search tasks by code, title, priority, status or assignee..."
                value={workItemSearchQuery}
                onChange={(e) => setWorkItemSearchQuery(e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1rem', width: '100%', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Employee Filter */}
              <select
                className="form-select"
                value={workItemAssigneeFilter}
                onChange={(e) => setWorkItemAssigneeFilter(e.target.value)}
                style={{ width: '180px', background: '#F8FAFC', border: '1px solid var(--border-soft)', height: '38px', borderRadius: 'var(--radius-md)' }}
              >
                <option value="all">All Employees</option>
                <option value="unassigned">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>

              {/* Status Multi-Select Filter */}
              <div style={{ position: 'relative', width: '180px' }}>
                <button
                  type="button"
                  className="form-select"
                  onClick={() => setWorkItemStatusDropdownOpen(!workItemStatusDropdownOpen)}
                  style={{
                    width: '180px', textAlign: 'left', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                    background: '#F8FAFC', border: '1px solid var(--border-soft)', height: '38px', borderRadius: 'var(--radius-md)'
                  }}
                >
                  {workItemStatusFilters.length === 0 ? 'All Statuses' : `${workItemStatusFilters.length} Statuses`}
                </button>

                {workItemStatusDropdownOpen && (
                  <>
                    <div onClick={() => setWorkItemStatusDropdownOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
                    <div
                      className="glass-panel"
                      style={{
                        position: 'absolute', top: '42px', left: 0, right: 0, zIndex: 999, background: '#FFFFFF',
                        border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px'
                      }}
                    >
                      {KANBAN_COLUMNS.map(col => {
                        const checked = workItemStatusFilters.includes(col.id);
                        return (
                          <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) setWorkItemStatusFilters(prev => prev.filter(x => x !== col.id));
                                else setWorkItemStatusFilters(prev => [...prev, col.id]);
                              }}
                            />
                            <span>{col.title}</span>
                          </label>
                        );
                      })}
                      <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" onClick={() => setWorkItemStatusFilters([])} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>Clear</button>
                        <button type="button" onClick={() => setWorkItemStatusDropdownOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}>Apply</button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Date Filter */}
              <input
                type="date"
                className="form-input"
                value={workItemDateFilter}
                onChange={(e) => setWorkItemDateFilter(e.target.value)}
                style={{ width: '150px', height: '38px', padding: '0 8px' }}
                title="Filter by due date"
              />
            </div>
          </div>

          {/* ===================================================================
              WORK ITEMS VIEW (GRID OR KANBAN)
              =================================================================== */}
          {workItemsLoading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading work items...</p>
          ) : workItems.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Layers size={40} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <p>No work items found under this selection.</p>
              <button 
                className="btn btn-primary"
                onClick={() => handleOpenCreateModal(structureTab === 'modules' ? 'internal' : 'client')}
                style={{ marginTop: '12px' }}
              >
                + Create Work Item
              </button>
            </div>
          ) : viewMode === 'kanban' ? (
            /* KANBAN BOARD VIEW */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
              {KANBAN_COLUMNS.map(col => {
                const colItems = workItems.filter(w => {
                  const s = (w.status || 'assigned').toLowerCase();
                  if (col.id === 'assigned') return s === 'assigned' || s === 'pending' || s === 'todo' || s === 'to_do';
                  if (col.id === 'in_progress') return s === 'in_progress' || s === 'inprogress' || s === 'in-progress';
                  if (col.id === 'completed') return s === 'completed' || s === 'resolved';
                  if (col.id === 'testing_in_progress') return s === 'testing_in_progress' || s === 'testing' || s === 'testing-in-progress';
                  if (col.id === 'bugs') return s === 'bugs' || s === 'bug' || s === 'bug_found';
                  if (col.id === 'open') return s === 'open' || s === 'new';
                  if (col.id === 'fixed') return s === 'fixed';
                  if (col.id === 'reopen') return s === 'reopen' || s === 'reopened';
                  if (col.id === 'testing_completed') return s === 'testing_completed' || s === 'testing-completed';
                  if (col.id === 'released') return s === 'released' || s === 'closed' || s === 'future_release';
                  return s === col.id;
                });

                return (
                  <div
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    style={{
                      background: col.bg,
                      border: `1px solid ${col.border}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      minHeight: '400px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: col.color, letterSpacing: '0.05em' }}>
                        {col.title}
                      </span>
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.06)', fontSize: '0.75rem' }}>
                        {colItems.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {colItems.map(item => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onClick={() => navigate(`/workitems/${item.id}`)}
                          className="glass-panel"
                          style={{
                            padding: '14px',
                            cursor: 'grab',
                            background: '#FFFFFF',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-soft)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>
                              {item.workNumber}
                            </span>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {renderWorkTypeIcon(item.workType)}
                              {renderPriorityIcon(item.priority)}
                            </div>
                          </div>

                          <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '8px', wordBreak: 'break-word' }}>
                            {item.title}
                          </div>

                          {/* Structure Context Badge */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                            {item.moduleName && (
                              <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea', border: '1px solid rgba(147, 51, 234, 0.25)' }}>
                                Mod: {item.moduleName}
                              </span>
                            )}
                            {item.clientName && (
                              <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(14, 165, 233, 0.1)', color: '#0284c7', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
                                Client: {item.clientName}
                              </span>
                            )}
                            {item.clientModuleName && (
                              <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.25)' }}>
                                Cl-Mod: {item.clientModuleName}
                              </span>
                            )}
                            {renderEpicBadge(item)}
                            {renderSeverityBadge(item.severity)}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-soft)', paddingTop: '8px', fontSize: '0.8rem' }}>
                            <div style={{ color: 'var(--text-secondary)' }}>
                              {item.assignedTo || 'Unassigned'}
                            </div>
                            {item.dueDate && (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                📅 {new Date(item.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* GRID / TABLE VIEW */
            <div className="glass-panel" style={{ padding: '10px' }}>
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Structure Path</th>
                      <th>Assignee</th>
                      <th>Created</th>
                      <th>Due Date</th>
                      <th style={{ width: '120px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workItems.map(item => (
                      <tr key={item.id}>
                        <td onClick={() => navigate(`/workitems/${item.id}`)} style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--primary)' }}>
                          {item.workNumber}
                        </td>
                        <td onClick={() => navigate(`/workitems/${item.id}`)} style={{ cursor: 'pointer', fontWeight: 600, maxWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{item.title}</span>
                            {renderEpicBadge(item)}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {renderWorkTypeIcon(item.workType)}
                            <span>{item.workType || 'Task'}</span>
                          </div>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={item.status}
                            onChange={(e) => handleInlineStatusChange(item.id, e.target.value)}
                            style={{ padding: '3px 8px', fontSize: '0.82rem', height: 'auto', width: 'auto' }}
                          >
                            <option value="assigned">ASSIGNED</option>
                            <option value="in_progress">IN-PROGRESS</option>
                            <option value="completed">COMPLETED</option>
                            <option value="testing_in_progress">TESTING-IN-PROGRESS</option>
                            <option value="bugs">BUGS</option>
                            <option value="open">OPEN</option>
                            <option value="fixed">FIXED</option>
                            <option value="reopen">RE-OPEN</option>
                            <option value="testing_completed">TESTING COMPLETED</option>
                            <option value="released">RELEASED</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {renderPriorityIcon(item.priority)}
                            <span style={{ textTransform: 'capitalize' }}>{item.priority}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.78rem' }}>
                            {item.moduleName && (
                              <span style={{ color: '#9333ea', fontWeight: 600 }}>📦 Module: {item.moduleName}</span>
                            )}
                            {item.clientName && (
                              <span style={{ color: '#0284c7', fontWeight: 600 }}>🏢 {item.clientName}</span>
                            )}
                            {item.clientModuleName && (
                              <span style={{ color: '#0d9488', fontWeight: 600 }}>↳ {item.clientModuleName}</span>
                            )}
                            {!item.moduleName && !item.clientModuleName && (
                              <span style={{ color: 'var(--text-muted)' }}>Core Product</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={item.assignedToUserId || ''}
                            onChange={(e) => handleInlineAssigneeChange(item.id, e.target.value === '' ? '' : Number(e.target.value))}
                            style={{ padding: '3px 8px', fontSize: '0.82rem', height: 'auto', width: 'auto' }}
                          >
                            <option value="">-- Unassigned --</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                          {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td>
                          <input
                            type="date"
                            value={item.dueDate ? item.dueDate.substring(0, 10) : ''}
                            onChange={(e) => handleInlineDueDateChange(item.id, e.target.value)}
                            style={{ padding: '3px 6px', fontSize: '0.82rem', borderRadius: '4px', border: '1px solid var(--border-soft)' }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditTask(item)}
                              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '2px' }}
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            {isPM && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTaskFromList(item.id)}
                                style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '2px' }}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {workItemsTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-soft)', paddingTop: '12px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setWorkItemPage(p => Math.max(p - 1, 1))}
                    disabled={workItemPage === 1}
                    style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Page {workItemPage} of {workItemsTotalPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setWorkItemPage(p => Math.min(p + 1, workItemsTotalPages))}
                    disabled={workItemPage === workItemsTotalPages}
                    style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* =====================================================================
            ROOT PRODUCTS LIST VIEW (PRODUCT IS ROOT ENTITY)
            ===================================================================== */
        <div>
          <div className="page-header" style={{ marginBottom: '24px' }}>
            <div>
              <h1 style={{ margin: '0 0 6px 0', fontSize: '2.2rem' }}>Products</h1>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                {isPM 
                  ? 'Manage products, internal core modules, and client-specific implementations.' 
                  : 'Browse all products and click to view internal modules or client work.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {isPM && (
                <>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setHierarchyTab('products');
                      setShowHierarchyManager(true);
                    }} 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <LayoutGrid size={18} />
                    <span>Hierarchy Setup</span>
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setShowCreateProduct(true)} 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} />
                    <span>Create Product</span>
                  </button>
                </>
              )}
              <button 
                className="btn btn-secondary" 
                onClick={() => fetchProducts()} 
                title="Refresh products list"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                disabled={productsLoading}
              >
                <RefreshCw size={16} style={{ animation: productsLoading ? 'spin 1s linear infinite' : 'none' }} />
                <span>Refresh</span>
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleOpenCreateModal('internal')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusCircle size={16} />
                <span>Create Work Item</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', marginBottom: '28px' }}>
            <Search size={20} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search products by name, code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1rem', width: '100%', outline: 'none' }}
            />
          </div>

          {/* Products Table */}
          {productsLoading ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', marginBottom: '12px', display: 'inline-block' }} />
              <p>Loading products...</p>
            </div>
          ) : error && productsList.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
              <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '12px', display: 'inline-block' }} />
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Failed to load products</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>{error}</p>
              <button 
                className="btn btn-secondary"
                onClick={() => fetchProducts()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FolderGit2 size={40} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <p>
                {searchQuery.trim()
                  ? `No products matching "${searchQuery}".`
                  : isPM
                    ? 'No products found. Click "Create Product" to set up your first product.'
                    : 'No products available yet.'}
              </p>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '10px' }}>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Product Code</th>
                      <th>Product Name</th>
                      <th>Description</th>
                      <th>Created On</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => (
                      <tr key={p.id}>
                        <td onClick={() => loadProductDetails(p)} style={{ cursor: 'pointer' }}>
                          <span className="badge badge-testing" style={{ fontWeight: 700 }}>{p.productNumber}</span>
                        </td>
                        <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => loadProductDetails(p)}>
                          {p.name}
                        </td>
                        <td style={{ color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => loadProductDetails(p)}>
                          {p.description || 'No description provided.'}
                        </td>
                        <td style={{ cursor: 'pointer' }} onClick={() => loadProductDetails(p)}>
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                              onClick={() => loadProductDetails(p)}
                            >
                              <span>View</span>
                              <ChevronRight size={16} />
                            </div>
                            {isPM && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenMembersModal(p);
                                  }}
                                  style={{
                                    background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)',
                                    border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-sm)',
                                    padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem'
                                  }}
                                  title="Manage assigned employees for this project"
                                >
                                  <Users size={13} /> Members
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProductToEdit(p);
                                    setEditProductName(p.name);
                                    setEditProductDesc(p.description || '');
                                    setShowEditProduct(true);
                                  }}
                                  style={{
                                    background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
                                    border: '1px solid rgba(59,130,246,0.25)', borderRadius: 'var(--radius-sm)',
                                    padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem'
                                  }}
                                  title="Edit product"
                                >
                                  <Edit size={13} /> Edit
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p); }}
                                  style={{
                                    background: 'rgba(244,63,94,0.12)', color: '#f43f5e',
                                    border: '1px solid rgba(244,63,94,0.25)', borderRadius: 'var(--radius-sm)',
                                    padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem'
                                  }}
                                  title="Delete product"
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          UNIFIED CREATE WORK ITEM MODAL (SUPPORTS STRUCTURE A & B)
          ===================================================================== */}
      {showCreateFunctional && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '850px', width: '95%', maxHeight: '92vh', overflowY: 'auto', padding: '28px', background: '#FFFFFF', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontWeight: 800, fontSize: '1.3rem', color: 'var(--primary)' }}>Create Work Item</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Product-first hierarchy ticket creation</p>
              </div>
              <button type="button" onClick={() => setShowCreateFunctional(false)} style={{ background: '#F8FAFC', border: '1px solid var(--border-medium)', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkItemSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Product Selector */}
              <div className="form-group">
                <label htmlFor="selectProduct">Product <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  id="selectProduct"
                  className="form-select"
                  value={selectedProductIdForCreation}
                  onChange={(e) => handleProductChangeInCreation(e.target.value === '' ? '' : Number(e.target.value))}
                  style={productSelectError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : {}}
                >
                  <option value="">-- Select Product --</option>
                  {allProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.productNumber})</option>
                  ))}
                </select>
                {productSelectError && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{productSelectError}</span>}
              </div>

              {/* Branch Selector: Structure A (Module) vs Structure B (Client) */}
              <div className="form-group" style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-soft)' }}>
                <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>Branch Structure Hierarchy <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: createPath === 'internal' ? 700 : 500 }}>
                    <input
                      type="radio"
                      name="hierarchyPath"
                      checked={createPath === 'internal'}
                      onChange={() => setCreatePath('internal')}
                      style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                    />
                    <span>Structure A: Internal Module (Product → Module)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: createPath === 'client' ? 700 : 500 }}>
                    <input
                      type="radio"
                      name="hierarchyPath"
                      checked={createPath === 'client'}
                      onChange={() => setCreatePath('client')}
                      style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                    />
                    <span>Structure B: Client Work (Product → Client → Client Module)</span>
                  </label>
                </div>
              </div>

              {/* Structure A: Module dropdown */}
              {createPath === 'internal' && (
                <div className="form-group">
                  <label htmlFor="createModuleSelect">Module</label>
                  <select
                    id="createModuleSelect"
                    className="form-select"
                    value={selectedModuleIdForCreation}
                    onChange={(e) => setSelectedModuleIdForCreation(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={!selectedProductIdForCreation}
                  >
                    <option value="">-- Core Product (No Specific Module) --</option>
                    {modulesForCreation.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.moduleNumber})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Structure B: Client and Client Module dropdowns */}
              {createPath === 'client' && (
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="createClientSelect">Client <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select
                      id="createClientSelect"
                      className="form-select"
                      value={selectedClientIdForCreation}
                      onChange={(e) => handleClientChangeInCreation(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={!selectedProductIdForCreation}
                    >
                      <option value="">-- Select Client --</option>
                      {clientsForCreation.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.clientNumber})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="createClientModuleSelect">Client Module <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select
                      id="createClientModuleSelect"
                      className="form-select"
                      value={selectedClientModuleIdForCreation}
                      onChange={(e) => setSelectedClientModuleIdForCreation(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={!selectedClientIdForCreation}
                    >
                      <option value="">-- Select Client Module --</option>
                      {clientModulesForCreation.map(cm => (
                        <option key={cm.id} value={cm.id}>{cm.name} ({cm.clientModuleNumber})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Work Type & Status */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="funcWorkType">Work Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    id="funcWorkType"
                    className="form-select"
                    value={functionalWorkType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFunctionalWorkType(val);
                      if (val === 'Bug') setFunctionalStatus('new');
                      else setFunctionalStatus('pending');
                    }}
                  >
                    {isPM && <option value="Epic">⚡ Epic</option>}
                    <option value="Functional Requirements">⚡ Functional Requirements</option>
                    <option value="Issue">⚠️ Issue</option>
                  </select>
                </div>

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
                        <option value="open">Open</option>
                        <option value="in_progress">In-Progress</option>
                        <option value="fixed">Fixed</option>
                        <option value="reopen">Re-open</option>
                        <option value="testing_completed">Testing completed</option>
                        <option value="released">Released</option>
                      </>
                    ) : (
                      <>
                        <option value="assigned">ASSIGNED</option>
                        <option value="in_progress">IN-PROGRESS</option>
                        <option value="completed">COMPLETED</option>
                        <option value="testing_in_progress">TESTING-IN-PROGRESS</option>
                        <option value="bugs">BUGS</option>
                        <option value="open">OPEN</option>
                        <option value="fixed">FIXED</option>
                        <option value="reopen">RE-OPEN</option>
                        <option value="testing_completed">TESTING COMPLETED</option>
                        <option value="released">RELEASED</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Parent Selector */}
              {functionalWorkType !== 'Epic' && parentWorkItemsForCreation.length > 0 && (
                <div className="form-group">
                  <label htmlFor="parentSelect">Parent Work Item (Epic / Feature)</label>
                  <select
                    id="parentSelect"
                    className="form-select"
                    value={functionalParentId}
                    onChange={(e) => setFunctionalParentId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">-- None (Top Level) --</option>
                    {parentWorkItemsForCreation.map(p => (
                      <option key={p.id} value={p.id}>[{p.workNumber}] {p.title} ({p.workType || 'Item'})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Summary */}
              <div className="form-group">
                <label htmlFor="funcSummary">Summary <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="funcSummary"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Implement user validation logic"
                  value={newWorkTitle}
                  onChange={(e) => {
                    setNewWorkTitle(e.target.value);
                    if (e.target.value.trim()) setWorkTitleError('');
                  }}
                  style={workTitleError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : {}}
                />
                {workTitleError && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{workTitleError}</span>}
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="funcDesc">Description</label>
                <textarea
                  id="funcDesc"
                  className="form-input"
                  rows={4}
                  placeholder="Details and acceptance criteria..."
                  value={newWorkDesc}
                  onChange={(e) => setNewWorkDesc(e.target.value)}
                  style={{ fontSize: '0.92rem', resize: 'vertical' }}
                />
              </div>

              {/* Priority & Assignee */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="funcPriority">Priority</label>
                  <select
                    id="funcPriority"
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
                  <label htmlFor="funcAssignee">Assign To</label>
                  <select
                    id="funcAssignee"
                    className="form-select"
                    value={newWorkAssignedId}
                    onChange={(e) => setNewWorkAssignedId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">-- Unassigned --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date & Due Date */}
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="funcStartDate">Start Date</label>
                  <input
                    id="funcStartDate"
                    type="date"
                    className="form-input"
                    value={functionalStartDate}
                    onChange={(e) => setFunctionalStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="funcDueDate">Due Date</label>
                  <input
                    id="funcDueDate"
                    type="date"
                    className="form-input"
                    value={functionalDueDate}
                    onChange={(e) => setFunctionalDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Builds (if available) */}
              {buildsForCreation.length > 0 && (
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
                      {buildsForCreation.map(b => (
                        <option key={b.id} value={b.buildNumber}>{b.buildNumber}</option>
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
                      {buildsForCreation.map(b => (
                        <option key={b.id} value={b.buildNumber}>{b.buildNumber}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div className="form-group">
                <label>Attachments</label>
                <input
                  type="file"
                  multiple
                  onChange={handleAttachmentUpload}
                  disabled={uploadingFiles}
                  style={{ display: 'block', fontSize: '0.85rem' }}
                />
                {uploadedAttachmentUrls.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {uploadedAttachmentUrls.length} file(s) attached
                  </div>
                )}
              </div>

              {/* Submission Options */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="subType"
                      checked={submissionType === 'standard'}
                      onChange={() => setSubmissionType('standard')}
                    />
                    <span>Close on save</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="subType"
                      checked={submissionType === 'another'}
                      onChange={() => setSubmissionType('another')}
                    />
                    <span>Create another</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateFunctional(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creatingWorkItem}>
                    {creatingWorkItem ? 'Creating...' : 'Create Item'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* =====================================================================
          HIERARCHY SETUP MODAL (PRODUCTS, MODULES, CLIENTS, CLIENT MODULES, BUILDS)
          ===================================================================== */}
      {showHierarchyManager && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontWeight: 800 }} className="gradient-text">Hierarchy Setup</h2>
              <button className="modal-close" onClick={() => setShowHierarchyManager(false)} style={{ position: 'static' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Manage Products, Modules, Clients, and Client Modules for the hierarchy.
            </p>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-soft)', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
              {(['products', 'modules', 'clients', 'client_modules', 'builds'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setHierarchyTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: hierarchyTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                    color: hierarchyTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                    padding: '8px 12px 12px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    fontSize: '0.9rem'
                  }}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* TAB: PRODUCTS */}
            {hierarchyTab === 'products' && (
              <div>
                <form onSubmit={handleCreateProduct} style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-soft)', marginBottom: 0 }}>
                  <h4 style={{ marginBottom: '14px', fontWeight: 700 }}>Add Product</h4>
                  <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="hProdName">Product Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        id="hProdName"
                        type="text"
                        placeholder="e.g. HealthCare ERP"
                        className="form-input"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="hProdDesc">Description</label>
                      <input
                        id="hProdDesc"
                        type="text"
                        placeholder="Optional description"
                        className="form-input"
                        value={newProductDesc}
                        onChange={(e) => setNewProductDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={creatingProduct}>
                    {creatingProduct ? 'Adding...' : 'Add Product'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB: MODULES */}
            {hierarchyTab === 'modules' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Select Product to manage modules:</label>
                  <select
                    className="form-select"
                    value={hierarchySelectedProductIdForModule}
                    onChange={(e) => {
                      const id = e.target.value === '' ? '' : Number(e.target.value);
                      setHierarchySelectedProductIdForModule(id);
                      if (id) {
                        api.getModules(Number(id)).then(r => r.success && setHierarchyModules(r.data));
                      } else {
                        setHierarchyModules([]);
                      }
                    }}
                  >
                    <option value="">-- Select Product --</option>
                    {allProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.productNumber})</option>
                    ))}
                  </select>
                </div>

                {hierarchySelectedProductIdForModule && (
                  <>
                    <form onSubmit={handleCreateModuleInHierarchy} style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-soft)', marginBottom: '24px' }}>
                      <h4 style={{ marginBottom: '14px', fontWeight: 700 }}>Add Module</h4>
                      <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="hModName">Module Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                          <input
                            id="hModName"
                            type="text"
                            placeholder="e.g. Billing Engine"
                            className="form-input"
                            value={newModuleName}
                            onChange={(e) => setNewModuleName(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="hModDesc">Description</label>
                          <input
                            id="hModDesc"
                            type="text"
                            placeholder="Optional description"
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

                    <h4 style={{ marginBottom: '12px', fontWeight: 700 }}>Existing Modules ({hierarchyModules.length})</h4>
                    <div className="table-container">
                      <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hierarchyModules.map(m => (
                            <tr key={m.id}>
                              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{m.moduleNumber}</td>
                              <td style={{ fontWeight: 600 }}>{m.name}</td>
                              <td>{m.description || '-'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteModuleInHierarchy(m.id)}
                                  style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: CLIENTS */}
            {hierarchyTab === 'clients' && (
              <div>
                <form onSubmit={handleCreateClientInHierarchy} style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-soft)', marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '14px', fontWeight: 700 }}>Add Client</h4>
                  <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="hClientName">Client Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        id="hClientName"
                        type="text"
                        placeholder="e.g. Acme Health"
                        className="form-input"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="hClientProd">Product Link (Optional)</label>
                      <select
                        id="hClientProd"
                        className="form-select"
                        value={hierarchySelectedProductIdForClient}
                        onChange={(e) => setHierarchySelectedProductIdForClient(e.target.value === '' ? '' : Number(e.target.value))}
                      >
                        <option value="">-- No specific product --</option>
                        {allProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.productNumber})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="hClientDesc">Description</label>
                    <input
                      id="hClientDesc"
                      type="text"
                      placeholder="Optional description"
                      className="form-input"
                      value={newClientDesc}
                      onChange={(e) => setNewClientDesc(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={creatingClient}>
                    {creatingClient ? 'Adding...' : 'Add Client'}
                  </button>
                </form>

                <h4 style={{ marginBottom: '12px', fontWeight: 700 }}>Existing Clients ({allClients.length})</h4>
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Product</th>
                        <th>Description</th>
                        <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allClients.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{c.clientNumber}</td>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td>{c.productName || '-'}</td>
                          <td>{c.description || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteClientInHierarchy(c.id)}
                              style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: CLIENT MODULES */}
            {hierarchyTab === 'client_modules' && (
              <div>
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Filter by Product:</label>
                    <select
                      className="form-select"
                      value={hierarchySelectedProductIdForClientModule}
                      onChange={(e) => {
                        const id = e.target.value === '' ? '' : Number(e.target.value);
                        setHierarchySelectedProductIdForClientModule(id);
                        setHierarchySelectedClientIdForClientModule('');
                        setHierarchyClientModules([]);
                      }}
                    >
                      <option value="">-- All Products --</option>
                      {allProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.productNumber})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Select Client:</label>
                    <select
                      className="form-select"
                      value={hierarchySelectedClientIdForClientModule}
                      onChange={(e) => {
                        const id = e.target.value === '' ? '' : Number(e.target.value);
                        setHierarchySelectedClientIdForClientModule(id);
                        if (id) {
                          api.getClientModules(Number(id)).then(r => r.success && setHierarchyClientModules(r.data));
                        } else {
                          setHierarchyClientModules([]);
                        }
                      }}
                    >
                      <option value="">-- Select Client --</option>
                      {allClients
                        .filter(c => !hierarchySelectedProductIdForClientModule || c.productId === Number(hierarchySelectedProductIdForClientModule))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.clientNumber})</option>
                        ))}
                    </select>
                  </div>
                </div>

                {hierarchySelectedClientIdForClientModule && (
                  <>
                    <form onSubmit={handleCreateClientModuleInHierarchy} style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-soft)', marginBottom: '24px' }}>
                      <h4 style={{ marginBottom: '14px', fontWeight: 700 }}>Add Client Module</h4>
                      <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="hCMName">Client Module Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                          <input
                            id="hCMName"
                            type="text"
                            placeholder="e.g. Acme Custom Billing"
                            className="form-input"
                            value={newClientModuleName}
                            onChange={(e) => setNewClientModuleName(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="hCMDesc">Description</label>
                          <input
                            id="hCMDesc"
                            type="text"
                            placeholder="Optional description"
                            className="form-input"
                            value={newClientModuleDesc}
                            onChange={(e) => setNewClientModuleDesc(e.target.value)}
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={creatingClientModule}>
                        {creatingClientModule ? 'Adding...' : 'Add Client Module'}
                      </button>
                    </form>

                    <h4 style={{ marginBottom: '12px', fontWeight: 700 }}>Existing Client Modules ({hierarchyClientModules.length})</h4>
                    <div className="table-container">
                      <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hierarchyClientModules.map(cm => (
                            <tr key={cm.id}>
                              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{cm.clientModuleNumber}</td>
                              <td style={{ fontWeight: 600 }}>{cm.name}</td>
                              <td>{cm.description || '-'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClientModuleInHierarchy(cm.id)}
                                  style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: BUILDS */}
            {hierarchyTab === 'builds' && (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Manage release and QA builds. Builds can be selected during bug raising and status resolution.
                </p>
                <div className="table-container" style={{ marginTop: '16px' }}>
                  <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                      <tr>
                        <th>Build Number</th>
                        <th>Project / Scope</th>
                        <th>Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {builds.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 700 }}>{b.buildNumber}</td>
                          <td>{b.projectName || '-'}</td>
                          <td>{b.isActive ? 'Active' : 'Inactive'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          CREATE PRODUCT MODAL
          ===================================================================== */}
      {showCreateProduct && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setShowCreateProduct(false)}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '16px', fontWeight: 800 }} className="gradient-text">Create Product</h2>
            <form onSubmit={handleCreateProduct} noValidate>
              <div className="form-group">
                <label htmlFor="createProdName">Product Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="createProdName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. EHR Core Suite"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="createProdDesc">Description</label>
                <textarea
                  id="createProdDesc"
                  className="form-textarea"
                  rows={3}
                  placeholder="Product goals and scope..."
                  value={newProductDesc}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateProduct(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingProduct}>
                  {creatingProduct ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          EDIT PRODUCT MODAL
          ===================================================================== */}
      {showEditProduct && productToEdit && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setShowEditProduct(false)}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '16px', fontWeight: 800 }} className="gradient-text">Edit Product</h2>
            <form onSubmit={handleEditProduct} noValidate>
              <div className="form-group">
                <label htmlFor="editPName">Product Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="editPName"
                  type="text"
                  className="form-input"
                  value={editProductName}
                  onChange={(e) => setEditProductName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="editPDesc">Description</label>
                <textarea
                  id="editPDesc"
                  className="form-textarea"
                  rows={3}
                  value={editProductDesc}
                  onChange={(e) => setEditProductDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditProduct(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updatingProduct}>
                  {updatingProduct ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          EDIT TASK MODAL
          ===================================================================== */}
      {showEditTask && editingWorkItem && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '650px', width: '95%' }}>
            <button className="modal-close" onClick={() => setShowEditTask(false)}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '16px', fontWeight: 800 }} className="gradient-text">
              Edit Work Item ({editingWorkItem.workNumber})
            </h2>
            <form onSubmit={handleSaveEditTask} noValidate>
              <div className="form-group">
                <label htmlFor="editTaskTitle">Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="editTaskTitle"
                  type="text"
                  className="form-input"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="editTaskDesc">Description</label>
                <textarea
                  id="editTaskDesc"
                  className="form-textarea"
                  rows={3}
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                />
              </div>
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="editTaskPriority">Priority</label>
                  <select
                    id="editTaskPriority"
                    className="form-select"
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value as any)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="editTaskAssigned">Assign To</label>
                  <select
                    id="editTaskAssigned"
                    className="form-select"
                    value={editTaskAssignedId}
                    onChange={(e) => setEditTaskAssignedId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">-- Unassigned --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="editTaskStatus">Status</label>
                  <select
                    id="editTaskStatus"
                    className="form-select"
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value)}
                  >
                    <option value="pending">TO DO</option>
                    <option value="assigned">ASSIGNED</option>
                    <option value="reopened">REOPEN</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="future_release">FUTURE RELEASE</option>
                    <option value="fixed">FIXED</option>
                    <option value="completed">RESOLVED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="editTaskDueDate">Due Date</label>
                  <input
                    id="editTaskDueDate"
                    type="date"
                    className="form-input"
                    value={editTaskDueDate}
                    onChange={(e) => setEditTaskDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Attachments */}
              <div className="form-group" style={{ marginTop: '10px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Attachments</span>
                  <label htmlFor="editTaskFileAttach" style={{ cursor: 'pointer', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                    <Plus size={14} /> Attach Documents
                  </label>
                  <input
                    id="editTaskFileAttach"
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleEditTaskAttachmentUpload}
                  />
                </label>
                {uploadingEditFiles && <p style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Uploading file(s)...</p>}
                {editTaskAttachmentUrls.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {editTaskAttachmentUrls.map((url, idx) => {
                      const fileName = url.substring(url.lastIndexOf('/') + 1);
                      return (
                        <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', border: '1px solid var(--border-soft)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
                          <button
                            type="button"
                            onClick={() => setEditTaskAttachmentUrls(prev => prev.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0 }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditTask(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEditTask}>
                  {savingEditTask ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          FIXED BUILD MODAL
          ===================================================================== */}
      {showFixedBuildModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '420px' }}>
            <h3 style={{ marginBottom: '12px', fontWeight: 800 }}>Resolved Build Number</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Please select or enter the build in which this item was resolved.
            </p>
            <div className="form-group">
              <label>Select Build</label>
              <select
                className="form-select"
                value={selectedFixedBuild}
                onChange={(e) => setSelectedFixedBuild(e.target.value)}
              >
                <option value="">-- Select Build --</option>
                {modalBuildOptions.map(b => (
                  <option key={b.buildNumber} value={b.buildNumber}>{b.buildNumber}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Or Enter Custom Build</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. v2.4.1"
                value={customFixedBuild}
                onChange={(e) => setCustomFixedBuild(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleCancelFixedBuild}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmFixedBuild}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CUSTOM CONFIRM MODAL
          ===================================================================== */}
      {customConfirm && createPortal(
        <div
          onClick={() => setCustomConfirm(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(6, 6, 18, 0.75)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '92%', maxWidth: '400px',
              background: '#FFFFFF',
              border: '1px solid var(--border-soft)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontWeight: 800, color: '#f43f5e' }}>{customConfirm.message}</h3>
            {customConfirm.subtext && (
              <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {customConfirm.subtext}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setCustomConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={() => { const cb = customConfirm.onConfirm; setCustomConfirm(null); cb(); }}
                style={{ background: '#f43f5e', color: '#fff', border: 'none' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =====================================================================
          HIERARCHY & WORKFLOW DIAGRAM MODAL
          ===================================================================== */}
      {showHierarchyDiagramModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowHierarchyDiagramModal(false)}>
          <div 
            className="modal-content glass-panel" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '1280px', 
              width: '95vw', 
              maxHeight: '94vh', 
              overflowY: 'auto', 
              padding: '24px',
              background: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              color: '#f8fafc'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#f8fafc' }}>
                  Product Hierarchy & 11-Stage Status Lifecycle
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Architecture Blueprint: Product Root ➔ Module / Client ➔ Work Items ➔ 11 Status Steps
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href="/ticket-system/Product_Hierarchy_and_Workflow.png"
                  download="Product_Hierarchy_and_Workflow.png"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 14px' }}
                >
                  <Download size={14} /> Download Image (PNG)
                </a>
                <a
                  href="/ticket-system/Product_Workflow_Hierarchy_and_Status_Lifecycle.pdf"
                  download="Product_Workflow_Hierarchy_and_Status_Lifecycle.pdf"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 14px' }}
                >
                  <Download size={14} /> Download PDF
                </a>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowHierarchyDiagramModal(false)}
                  style={{ position: 'static', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '8px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', background: '#090d16', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              <img
                src="/ticket-system/Product_Hierarchy_and_Workflow.png"
                alt="Product Hierarchy and Status Progression Lifecycle"
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '12px' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =====================================================================
          MANAGE PROJECT MEMBERS MODAL
          ===================================================================== */}
      {showEditMembersModal && (managingMembersForProduct || selectedProduct) && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '560px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <Users size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }} className="gradient-text">
                    Project Members
                  </h2>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {(managingMembersForProduct || selectedProduct)?.name} ({(managingMembersForProduct || selectedProduct)?.productNumber})
                  </span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowEditMembersModal(false)} style={{ position: 'static' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Select which employees have access to this project. Assigned employees can view this project and be assigned tasks.
            </p>

            {/* Search and Selection Helpers */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
              <div className="search-input-wrapper" style={{ flex: 1 }}>
                <Search size={15} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search employees by name or email..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  style={{ paddingLeft: '38px', height: '36px', fontSize: '0.85rem' }}
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                onClick={() => setSelectedMemberIds(employees.map(e => e.id))}
              >
                Select All
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                onClick={() => setSelectedMemberIds([])}
              >
                Clear All
              </button>
            </div>

            {/* Employee Checkbox List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '340px',
              border: '1px solid var(--border-soft)',
              borderRadius: '8px',
              padding: '6px',
              background: 'var(--bg-surface)'
            }}>
              {loadingProjectMembers ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading current members...</p>
                </div>
              ) : (
                (() => {
                  const filtered = employees.filter(emp =>
                    emp.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                    emp.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No employees found matching "{memberSearchQuery}".
                      </div>
                    );
                  }

                  return filtered.map(emp => {
                    const isChecked = selectedMemberIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          border: isChecked ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                          marginBottom: '4px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMemberIds(prev => [...prev, emp.id]);
                            } else {
                              setSelectedMemberIds(prev => prev.filter(id => id !== emp.id));
                            }
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: isChecked ? 'var(--primary)' : 'rgba(100, 116, 139, 0.2)',
                          color: isChecked ? '#fff' : 'var(--text-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                        }}>
                          {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                            {emp.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {emp.email}
                          </div>
                        </div>
                        {isChecked && (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Check size={11} /> Member
                          </span>
                        )}
                      </label>
                    );
                  });
                })()
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <strong>{selectedMemberIds.length}</strong> {selectedMemberIds.length === 1 ? 'employee' : 'employees'} selected
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditMembersModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveProjectMembers}
                  disabled={savingMembers}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {savingMembers ? (
                    <>
                      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Members</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const renderPriorityIcon = (priority?: string) => {
  const p = (priority || 'medium').toLowerCase();
  if (p === 'critical' || p === 'high') {
    return <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '1.1rem' }}>⇈</span>;
  }
  if (p === 'medium') {
    return <span style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '1.1rem' }}>＝</span>;
  }
  return <span style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: '1.1rem' }}>↓</span>;
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
