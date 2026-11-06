export const API_BASE_URL = '/ticket-system';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserSession {
  token: string;
  userType: 'ProductManager' | 'Employee';
  name: string;
  userId: number;
  email?: string;
  profilePicture?: string;
  roles?: string[];
}

export interface ClientDto {
  id: number;
  clientNumber: string;
  name: string;
  description?: string;
  productId?: number | null;
  productName?: string | null;
  createdAt: string;
}

export interface ClientModuleDto {
  id: number;
  clientModuleNumber: string;
  name: string;
  description?: string;
  clientId: number;
  clientName: string;
  createdAt: string;
}

export interface ProductDto {
  id: number;
  productNumber: string;
  name: string;
  description?: string;
  projectId?: number | null;
  projectName?: string;
  createdAt: string;
}

export interface ModuleDto {
  id: number;
  moduleNumber: string;
  name: string;
  description?: string;
  productId: number;
  productName: string;
  createdAt: string;
}

export interface SoftwareBuildDto {
  id: number;
  buildNumber: string;
  projectId: number;
  projectName: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProjectDto {
  id: number;
  projectNumber: string;
  name: string;
  description: string;
  status: string;
  createdBy: string;
  createdAt: string;
  clientId?: number;
  clientName?: string;
  workItems?: WorkItemDto[];
  assignedEmployees?: EmployeeDropdownDto[];
}

export interface WorkItemDto {
  id: number;
  workNumber: string;
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  workType?: string;
  startDate?: string | null;
  parentId?: number | null;
  parentWorkNumber?: string | null;
  parentTitle?: string | null;
  parentEpicName?: string | null;
  parentEpicColor?: string | null;
  labels?: string | null;
  team?: string | null;
  attachmentUrls?: string | null;
  projectId?: number | null;
  projectName?: string;
  projectNumber?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
  dueDate?: string | null;
  moduleId?: number | null;
  moduleName?: string;
  clientModuleId?: number | null;
  clientModuleName?: string;
  productId?: number | null;
  productName?: string;
  clientId?: number | null;
  clientName?: string;
  epicName?: string | null;
  epicColor?: string | null;
  severity?: string | null;
  issueType?: string | null;
  assignedToUserId?: number | null;
  fixedBillNumber?: string | null;
  raisedBillNumber?: string | null;
  developerBillLock?: boolean;
  createdByUserId: number;
  raisedBuild?: string | null;
  fixedBuild?: string | null;
}

export interface EmployeeDropdownDto {
  id: number;
  name: string;
  email: string;
}

export interface EmployeeFullDto {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  isActive: boolean;
  createdAt: string;
  userType?: string;
}

export interface BugDto {
  id: number;
  bugNumber: string;
  title: string;
  description: string;
  screenshotUrl: string | null;
  status: 'open' | 'in_progress' | 'fixed' | 'closed';
  workItemTitle: string;
  workNumber: string;
  workItemId: number;
  raisedBy: string;
  assignedTo: string | null;
  raisedBuild?: string | null;
  fixedBuild?: string | null;
  severity?: string | null;
  createdAt: string;
  fixedAt: string | null;
  closedAt: string | null;
}

export interface CommentDto {
  id: number;
  message: string;
  isInternal: boolean;
  postedBy: string;
  workItemTitle: string;
  createdAt: string;
}

export interface WorkItemActivityLogDto {
  id: number;
  action: string;
  fromUser?: string | null;
  toUser?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  byUser: string;
  note?: string | null;
  timestamp: string;
}

export interface WorkItemStatusCountDto {
  pending: number;
  assigned?: number;
  inProgress: number;
  completed: number;
  testingInProgress?: number;
  bugs?: number;
  open?: number;
  fixed?: number;
  reopen?: number;
  testingCompleted?: number;
  released?: number;
  testing: number;
  bugFound: number;
  closed: number;
}

export interface BugStatusCountDto {
  open: number;
  inProgress: number;
  fixed: number;
  closed: number;
}

export interface EmployeeTaskDto {
  id: number;
  workNumber: string;
  title: string;
  status: string;
  priority: string;
  projectId: number;
  projectName: string;
  clientName?: string;
  productName?: string;
  moduleName?: string;
}

export interface DailyStatusNoteDto {
  id: number;
  noteText: string;
  createdAt: string;
  createdByName: string;
}

export interface PersonalNoteDto {
  id: number;
  content: string;
  createdAt: string;
  noteDate: string;
  priority: string;
  assignedToUserId?: number | null;
  assignedToUserName?: string | null;
  creatorUserId: number;
  creatorUserName?: string | null;
}

export interface EmployeeWorkItemCountDto {
  employeeId: number;
  employeeName: string;
  totalAssigned: number;
  pending: number;
  inProgress: number;
  completed: number;
  testing: number;
  bugFound: number;
  closed: number;
  assignedTasks: EmployeeTaskDto[];
  latestNote?: string;
  latestNoteDate?: string;
  noteHistory: DailyStatusNoteDto[];
}

export interface DashboardResponseDto {
  totalProjects: number;
  totalWorkItems: number;
  totalBugs: number;
  workItemStatusCount: WorkItemStatusCountDto;
  bugStatusCount: BugStatusCountDto;
  employeeWorkItemCounts: EmployeeWorkItemCountDto[];
}

export interface AdminStatusCountsDto {
  todo: number;
  assigned: number;
  reopen: number;
  inProgress: number;
  futureRelease: number;
  fixed: number;
  completed: number;
  closed: number;
  open: number;
  testingInProgress?: number;
  bugs?: number;
  testingCompleted?: number;
  released?: number;
}

export interface AdminEmployeeBreakdownDto {
  employeeId: number;
  employeeName: string;
  totalAssigned: number;
  todo: number;
  assigned: number;
  reopen: number;
  inProgress: number;
  futureRelease: number;
  fixed: number;
  completed: number;
  closed: number;
  open: number;
  testingInProgress?: number;
  bugs?: number;
  testingCompleted?: number;
  released?: number;
}

export interface AdminDashboardResponseDto {
  totalProjects: number;
  totalEmployees: number;
  totalWorkItems: number;
  totalBugs: number;
  statusCounts: AdminStatusCountsDto;
  employeeBreakdown: AdminEmployeeBreakdownDto[];
}

export interface EmployeeAssignedProjectDto {
  projectId: number;
  projectName: string;
}

export interface EmployeeDashboardResponseDto {
  totalAssigned: number;
  totalProjects: number;
  statusCounts: AdminStatusCountsDto;
  assignedProjects: EmployeeAssignedProjectDto[];
}

// Request Helper
export async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Content type check
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (!url.startsWith('/api/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = `${import.meta.env.BASE_URL}login`;
    }
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type');
  let json: any = null;
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await res.json();
    } catch (_) { }
  }

  if (!res.ok) {
    throw new Error(json?.message || json?.Message || `Request failed with status ${res.status}`);
  }

  if (!json) {
    throw new Error('Empty or invalid response from server');
  }

  return json as ApiResponse<T>;
}

async function requestCsvExport(
  url: string,
  params: Record<string, string | number | undefined>
): Promise<{ blob: Blob; filename: string | null }> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      q.set(key, String(value));
    }
  });

  const token = localStorage.getItem('token');
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${url}?${q}`, { headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = `${import.meta.env.BASE_URL}login`;
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error(`Export failed with status ${res.status}`);
  }

  const disposition = res.headers.get('content-disposition');
  const match = disposition && /filename="?([^";]+)"?/i.exec(disposition);

  return { blob: await res.blob(), filename: match ? match[1] : null };
}

// API methods
export const api = {
  // Authentication
  login: (body: any) =>
    request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyOtp: (body: any) =>
    request<UserSession>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  switchRole: (targetRole: 'ProductManager' | 'Employee') =>
    request<UserSession>('/api/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ targetRole }),
    }),

  forgotPassword: (email: string) =>
    request<string>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPasswordWithOtp: (body: any) =>
    request<string>('/api/auth/reset-password-otp', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  registerEmployee: (body: any) =>
    request<any>('/api/auth/register/employee', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  createUser: (body: any) =>
    request<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  registerProductManager: (body: any) =>
    request<any>('/api/auth/register/productmanager', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Dashboard
  getDashboard: () => request<DashboardResponseDto>('/api/dashboard'),

  getAdminDashboard: (params: { projectId?: number; employeeId?: number; fromDate?: string; toDate?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.projectId) q.set('projectId', String(params.projectId));
    if (params.employeeId) q.set('employeeId', String(params.employeeId));
    if (params.fromDate) q.set('fromDate', params.fromDate);
    if (params.toDate) q.set('toDate', params.toDate);
    return request<AdminDashboardResponseDto>(`/api/Dashboard/admin?${q}`);
  },

  getAdminWorkItems: (params: { tab?: string; projectId?: number; page?: number; pageSize?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.tab) q.set('tab', params.tab);
    if (params.projectId) q.set('projectId', String(params.projectId));
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    return request<PagedResult<WorkItemDto>>(`/api/Dashboard/admin/workitems?${q}`);
  },

  getEmployeeWorkItems: (params: { projectId?: number; page?: number; pageSize?: number; search?: string; status?: string; assignedToUserId?: number; fromDueDate?: string; toDueDate?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.projectId) q.set('projectId', String(params.projectId));
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.assignedToUserId) q.set('assignedToUserId', String(params.assignedToUserId));
    if (params.fromDueDate) q.set('fromDueDate', params.fromDueDate);
    if (params.toDueDate) q.set('toDueDate', params.toDueDate);
    return request<PagedResult<WorkItemDto>>(`/api/Dashboard/employee/workitems?${q}`);
  },

  getEmployeeDashboard: (params: { projectId?: number; fromDate?: string; toDate?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.projectId) q.set('projectId', String(params.projectId));
    if (params.fromDate) q.set('fromDate', params.fromDate);
    if (params.toDate) q.set('toDate', params.toDate);
    return request<EmployeeDashboardResponseDto>(`/api/Dashboard/employee?${q}`);
  },

  // Projects
  getAllProjects: () => request<ProjectDto[]>('/api/project'),

  // Paginated + filtered projects
  getAllProjectsPaged: (params: { page?: number; pageSize?: number; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.search) q.set('search', params.search);
    return request<PagedResult<ProjectDto>>(`/api/project/paged?${q}`);
  },

  getProjectById: (projectId: number) =>
    request<ProjectDto & { workItems: WorkItemDto[] }>(`/api/project/${projectId}`),

  createProject: (body: { name: string; description: string; assignedEmployeeIds?: number[]; clientId?: number }) =>
    request<ProjectDto>('/api/project', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProjectMembers: (projectId: number, assignedEmployeeIds: number[]) =>
    request<ProjectDto>(`/api/project/${projectId}/members`, {
      method: 'PUT',
      body: JSON.stringify({ assignedEmployeeIds }),
    }),

  updateProject: (projectId: number, body: { name: string; description?: string; status: string; clientId?: number }) =>
    request<ProjectDto>(`/api/project/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // Work Items
  createWorkItem: (projectId: number, body: any) =>
    request<WorkItemDto>(`/api/project/${projectId}/workitems`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateWorkItem: (workItemId: number, body: any) =>
    request<WorkItemDto>(`/api/project/workitems/${workItemId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteWorkItem: (workItemId: number) =>
    request<string>(`/api/project/workitems/${workItemId}`, {
      method: 'DELETE',
    }),

  getWorkItemsByProject: (projectId: number) =>
    request<WorkItemDto[]>(`/api/project/${projectId}/workitems`),

  // Paginated + filtered project work items
  getWorkItemsByProjectPaged: (projectId: number, params: { page?: number; pageSize?: number; status?: string; search?: string; assignedTo?: string; dueDate?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    if (params.assignedTo) q.set('assignedTo', params.assignedTo);
    if (params.dueDate) q.set('dueDate', params.dueDate);
    return request<PagedResult<WorkItemDto>>(`/api/project/${projectId}/workitems/paged?${q}`);
  },


  // Paginated + filtered employee work items
  getMyWorkItemsPaged: (params: { page?: number; pageSize?: number; status?: string; dueDate?: string; search?: string; workType?: string; priority?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.status) q.set('status', params.status);
    if (params.dueDate) q.set('dueDate', params.dueDate);
    if (params.search) q.set('search', params.search);
    if (params.workType) q.set('workType', params.workType);
    if (params.priority) q.set('priority', params.priority);
    return request<PagedResult<WorkItemDto>>(`/api/project/workitems/myworks/paged?${q}`);
  },

  getWorkItemById: (workItemId: number) =>
    request<WorkItemDto>(`/api/project/workitems/${workItemId}`),

  getEmployeesDropdown: () => request<EmployeeDropdownDto[]>('/api/project/employees/dropdown'),

  updateWorkItemStatus: (workItemId: number, payload: string | { status: string; fixedBillNumber?: string; raisedBillNumber?: string; developerBillLock?: boolean; fixedBuild?: string }) => {
    const bodyObj = typeof payload === 'string' ? { status: payload } : payload;
    return request<WorkItemDto>(`/api/project/workitems/${workItemId}/status`, {
      method: 'PUT',
      body: JSON.stringify(bodyObj),
    });
  },

  reassignWorkItem: (workItemId: number, assignedToUserId: number | null) =>
    request<WorkItemDto>(`/api/project/workitems/${workItemId}/reassign`, {
      method: 'PUT',
      body: JSON.stringify({ assignedToUserId }),
    }),

  getWorkItemActivity: (workItemId: number) =>
    request<WorkItemActivityLogDto[]>(`/api/project/workitems/${workItemId}/activity`),

  getInvolvedWorkItems: () =>
    request<WorkItemDto[]>(`/api/project/workitems/myworks/involved`),

  uploadAttachment: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<string>('/api/project/workitems/upload-attachment', {
      method: 'POST',
      body: formData,
    });
  },

  updateWorkItemDescription: (workItemId: number, description: string | null) =>
    request<WorkItemDto>(`/api/project/workitems/${workItemId}/description`, {
      method: 'PUT',
      body: JSON.stringify({ description }),
    }),

  addWorkItemAttachment: (workItemId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<WorkItemDto>(`/api/project/workitems/${workItemId}/attachments`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteWorkItemAttachment: (workItemId: number, fileUrl: string) =>
    request<WorkItemDto>(`/api/project/workitems/${workItemId}/attachments?fileUrl=${encodeURIComponent(fileUrl)}`, {
      method: 'DELETE',
    }),

  updateWorkItemDueDate: (workItemId: number, dueDate: string | null) =>
    request<WorkItemDto>(`/api/project/workitems/${workItemId}/duedate`, {
      method: 'PUT',
      body: JSON.stringify({ dueDate }),
    }),

  // Bugs
  createBug: (formData: FormData) =>
    request<BugDto>('/api/project/workitems/bugs', {
      method: 'POST',
      body: formData, // boundary is set automatically
    }),

  getBugsByWorkItem: (workItemId: number) =>
    request<BugDto[]>(`/api/project/workitems/${workItemId}/bugs`),

  getMyBugs: () => request<BugDto[]>('/api/project/workitems/bugs/mybugs'),


  getAllBugsPaged: (params: { page?: number; pageSize?: number; status?: string; date?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.status) q.set('status', params.status);
    if (params.date) q.set('date', params.date);
    if (params.search) q.set('search', params.search);
    return request<PagedResult<BugDto>>(`/api/project/workitems/bugs/all/paged?${q}`);
  },

  updateBugStatus: (bugId: number, status: string, fixedBuild?: string | null) =>
    request<BugDto>(`/api/project/workitems/bugs/${bugId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, fixedBuild }),
    }),

  reassignBug: (bugId: number, assignedToUserId: number | null) =>
    request<BugDto>(`/api/project/workitems/bugs/${bugId}/reassign`, {
      method: 'PUT',
      body: JSON.stringify({ assignedToUserId }),
    }),

  // Comments
  addComment: (workItemId: number, message: string, isInternal: boolean) =>
    request<CommentDto>('/api/project/workitems/comments', {
      method: 'POST',
      body: JSON.stringify({ workItemId, message, isInternal }),
    }),

  getCommentsByWorkItem: (workItemId: number) =>
    request<CommentDto[]>(`/api/project/workitems/${workItemId}/comments`),

  // Employee Management (PM only)
  getAllEmployeesFull: () =>
    request<EmployeeFullDto[]>('/api/project/employees'),

  deactivateEmployee: (userId: number) =>
    request<string>(`/api/project/employees/${userId}/deactivate`, {
      method: 'PUT',
    }),

  // Hierarchy Management
  getAllProducts: () =>
    request<ProductDto[]>('/api/project/products'),

  getClients: (productId?: number) =>
    request<ClientDto[]>(productId ? `/api/project/clients?productId=${productId}` : '/api/project/clients'),

  getClientsByProduct: (productId: number) =>
    request<ClientDto[]>(`/api/project/products/${productId}/clients`),

  createClient: (name: string, description?: string, productId?: number) =>
    request<ClientDto>('/api/project/clients', {
      method: 'POST',
      body: JSON.stringify({ name, description, productId }),
    }),

  updateClient: (clientId: number, name: string, description?: string, productId?: number) =>
    request<ClientDto>(`/api/project/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description, productId }),
    }),

  getProducts: (projectId?: number) =>
    request<ProductDto[]>(projectId ? `/api/project/${projectId}/products` : '/api/project/products'),

  createProduct: (name: string, description?: string, projectId?: number) =>
    request<ProductDto>('/api/project/products', {
      method: 'POST',
      body: JSON.stringify({ name, description, projectId }),
    }),

  updateProduct: (productId: number, name: string, description?: string, projectId?: number) =>
    request<ProductDto>(`/api/project/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description, projectId }),
    }),

  getModules: (productId: number) =>
    request<ModuleDto[]>(`/api/project/products/${productId}/modules`),

  createModule: (name: string, description: string | undefined, productId: number) =>
    request<ModuleDto>('/api/project/modules', {
      method: 'POST',
      body: JSON.stringify({ name, description, productId }),
    }),

  updateModule: (moduleId: number, name: string, description: string | undefined, productId: number) =>
    request<ModuleDto>(`/api/project/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description, productId }),
    }),

  getClientModules: (clientId: number) =>
    request<ClientModuleDto[]>(`/api/project/clients/${clientId}/modules`),

  createClientModule: (name: string, clientId: number, description?: string) =>
    request<ClientModuleDto>('/api/project/client-modules', {
      method: 'POST',
      body: JSON.stringify({ name, clientId, description }),
    }),

  updateClientModule: (clientModuleId: number, name: string, clientId: number, description?: string) =>
    request<ClientModuleDto>(`/api/project/client-modules/${clientModuleId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, clientId, description }),
    }),

  deleteClientModule: (clientModuleId: number) =>
    request<string>(`/api/project/client-modules/${clientModuleId}`, {
      method: 'DELETE',
    }),

  getWorkItemsByParent: (params: { moduleId?: number; clientModuleId?: number; productId?: number }) => {
    const q = new URLSearchParams();
    if (params.moduleId) q.set('moduleId', String(params.moduleId));
    if (params.clientModuleId) q.set('clientModuleId', String(params.clientModuleId));
    if (params.productId) q.set('productId', String(params.productId));
    return request<WorkItemDto[]>(`/api/project/parents/workitems?${q}`);
  },

  getWorkItemsByParentPaged: (params: {
    moduleId?: number;
    clientModuleId?: number;
    productId?: number;
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    assignedTo?: string;
    dueDate?: string;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.moduleId) q.set('moduleId', String(params.moduleId));
    if (params.clientModuleId) q.set('clientModuleId', String(params.clientModuleId));
    if (params.productId) q.set('productId', String(params.productId));
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    if (params.assignedTo) q.set('assignedTo', params.assignedTo);
    if (params.dueDate) q.set('dueDate', params.dueDate);
    return request<PagedResult<WorkItemDto>>(`/api/project/parents/workitems/paged?${q}`);
  },

  createWorkItemDirect: (body: any) =>
    request<WorkItemDto>('/api/project/workitems', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getBuildsByProject: (projectId?: number | null) =>
    projectId ? request<SoftwareBuildDto[]>(`/api/project/${projectId}/builds`) : Promise.resolve({ success: true, message: '', data: [] as SoftwareBuildDto[] }),

  createBuild: (buildNumber: string, projectId: number) =>
    request<SoftwareBuildDto>('/api/project/builds', {
      method: 'POST',
      body: JSON.stringify({ buildNumber, projectId }),
    }),

  deleteBuild: (buildId: number) =>
    request<string>(`/api/project/builds/${buildId}`, {
      method: 'DELETE',
    }),

  deleteClient: (clientId: number) =>
    request<string>(`/api/project/clients/${clientId}`, {
      method: 'DELETE',
    }),

  deleteProduct: (productId: number) =>
    request<string>(`/api/project/products/${productId}`, {
      method: 'DELETE',
    }),

  deleteModule: (moduleId: number) =>
    request<string>(`/api/project/modules/${moduleId}`, {
      method: 'DELETE',
    }),

  updateBuild: (buildId: number, buildNumber: string, projectId: number, isActive: boolean) =>
    request<SoftwareBuildDto>(`/api/project/builds/${buildId}`, {
      method: 'PUT',
      body: JSON.stringify({ buildNumber, projectId, isActive }),
    }),

  deleteProject: (projectId: number) =>
    request<string>(`/api/project/${projectId}`, {
      method: 'DELETE',
    }),

  addEmployeeNote: (employeeId: number, noteText: string) =>
    request<DailyStatusNoteDto>(`/api/employees/${employeeId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ noteText }),
    }),

  getPersonalNotes: (date?: string) =>
    request<PersonalNoteDto[]>(`/api/project/personalnotes${date ? `?date=${date}` : ''}`),

  createPersonalNote: (content: string, noteDate?: string, priority?: string, assignedToUserId?: number | null) =>
    request<PersonalNoteDto>('/api/project/personalnotes', {
      method: 'POST',
      body: JSON.stringify({ content, noteDate, priority, assignedToUserId }),
    }),

  updatePersonalNote: (id: number, content: string, noteDate?: string, priority?: string, assignedToUserId?: number | null) =>
    request<PersonalNoteDto>(`/api/project/personalnotes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content, noteDate, priority, assignedToUserId }),
    }),

  deletePersonalNote: (id: number) =>
    request<string>(`/api/project/personalnotes/${id}`, {
      method: 'DELETE',
    }),

  resetPassword: (currentPassword: string, newPassword: string) =>
    request<string>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  updateEmail: (newEmail: string) =>
    request<string>('/api/auth/update-email', {
      method: 'PUT',
      body: JSON.stringify({ newEmail }),
    }),

  adminResetPassword: (employeeId: number, newPassword: string) =>
    request<string>(`/api/project/employees/${employeeId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  adminUpdateEmail: (employeeId: number, newEmail: string) =>
    request<string>(`/api/project/employees/${employeeId}/update-email`, {
      method: 'PUT',
      body: JSON.stringify({ newEmail }),
    }),

  uploadProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<string>('/api/auth/profile-picture', {
      method: 'POST',
      body: formData,
    });
  },

  removeProfilePicture: () =>
    request<string>('/api/auth/profile-picture', {
      method: 'DELETE',
    }),

  getExportColumns: () => request<string[]>('/api/Dashboard/export/columns'),

  exportAdminCsv: (params: {
    projectId?: number;
    employeeId?: number;
    fromDate?: string;
    toDate?: string;
    status?: string;
    priority?: string;
    workType?: string;
    moduleId?: number;
    clientId?: number;
    raisedBuild?: string;
    fixedBuild?: string;
    columns?: string;
  } = {}) => requestCsvExport('/api/Dashboard/admin/export', params),

  exportEmployeeCsv: (params: {
    projectId?: number;
    fromDate?: string;
    toDate?: string;
    status?: string;
    priority?: string;
    workType?: string;
    moduleId?: number;
    clientId?: number;
    raisedBuild?: string;
    fixedBuild?: string;
    columns?: string;
  } = {}) => requestCsvExport('/api/Dashboard/employee/export', params),

  importJiraCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{
      projectsImported: number;
      usersImported: number;
      workItemsImported: number;
      bugsImported: number;
      warnings: string[];
      errors: string[];
    }>('/api/jiraimport/import', {
      method: 'POST',
      body: formData,
    });
  },
};
