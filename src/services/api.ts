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
}

export interface ClientDto {
  id: number;
  clientNumber: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ProductDto {
  id: number;
  productNumber: string;
  name: string;
  description?: string;
  projectId: number;
  projectName: string;
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
  projectId: number;
  projectName: string;
  projectNumber: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  dueDate?: string | null;
  moduleId?: number;
  moduleName?: string;
  productId?: number;
  productName?: string;
  clientId?: number;
  clientName?: string;
  epicName?: string | null;
  epicColor?: string | null;
  severity?: string | null;
  assignedToUserId?: number | null;
  fixedBillNumber?: string | null;
  raisedBillNumber?: string | null;
  developerBillLock?: boolean;
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
  inProgress: number;
  completed: number;
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

// Request Helper
async function request<T>(
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
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type');
  let json: any = null;
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await res.json();
    } catch (_) {}
  }

  if (!res.ok) {
    throw new Error(json?.message || `Request failed with status ${res.status}`);
  }

  if (!json) {
    throw new Error('Empty or invalid response from server');
  }

  return json as ApiResponse<T>;
}

// API methods
export const api = {
  // Authentication
  login: (body: any) =>
    request<UserSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  registerEmployee: (body: any) =>
    request<any>('/api/auth/register/employee', {
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

  // Projects
  getAllProjects: () => request<ProjectDto[]>('/api/project'),

  // Paginated + filtered projects
  getAllProjectsPaged: (params: { page?: number; pageSize?: number; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page)     q.set('page',     String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.search)   q.set('search',   params.search);
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

  // Work Items
  createWorkItem: (projectId: number, body: any) =>
    request<WorkItemDto>(`/api/project/${projectId}/workitems`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getWorkItemsByProject: (projectId: number) =>
    request<WorkItemDto[]>(`/api/project/${projectId}/workitems`),

  // Paginated + filtered project work items
  getWorkItemsByProjectPaged: (projectId: number, params: { page?: number; pageSize?: number; status?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page)     q.set('page',     String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.status)   q.set('status',   params.status);
    if (params.search)   q.set('search',   params.search);
    return request<PagedResult<WorkItemDto>>(`/api/project/${projectId}/workitems/paged?${q}`);
  },


  // Paginated + filtered employee work items
  getMyWorkItemsPaged: (params: { page?: number; pageSize?: number; status?: string; dueDate?: string; search?: string; workType?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page)     q.set('page',     String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.status)   q.set('status',   params.status);
    if (params.dueDate)  q.set('dueDate',  params.dueDate);
    if (params.search)   q.set('search',   params.search);
    if (params.workType) q.set('workType', params.workType);
    return request<PagedResult<WorkItemDto>>(`/api/project/workitems/myworks/paged?${q}`);
  },

  getWorkItemById: (workItemId: number) =>
    request<WorkItemDto>(`/api/project/workitems/${workItemId}`),

  getEmployeesDropdown: () => request<EmployeeDropdownDto[]>('/api/project/employees/dropdown'),

  updateWorkItemStatus: (workItemId: number, payload: string | { status: string; fixedBillNumber?: string; raisedBillNumber?: string; developerBillLock?: boolean }) => {
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
    if (params.page)     q.set('page',     String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.status)   q.set('status',   params.status);
    if (params.date)     q.set('date',     params.date);
    if (params.search)   q.set('search',   params.search);
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
  getClients: () =>
    request<ClientDto[]>('/api/project/clients'),

  createClient: (name: string, description?: string) =>
    request<ClientDto>('/api/project/clients', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  getProducts: (projectId: number) =>
    request<ProductDto[]>(`/api/project/${projectId}/products`),

  createProduct: (name: string, description: string | undefined, projectId: number) =>
    request<ProductDto>('/api/project/products', {
      method: 'POST',
      body: JSON.stringify({ name, description, projectId }),
    }),

  getModules: (productId: number) =>
    request<ModuleDto[]>(`/api/project/products/${productId}/modules`),

  createModule: (name: string, description: string | undefined, productId: number) =>
    request<ModuleDto>('/api/project/modules', {
      method: 'POST',
      body: JSON.stringify({ name, description, productId }),
    }),

  getBuildsByProject: (projectId: number) =>
    request<SoftwareBuildDto[]>(`/api/project/${projectId}/builds`),

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
