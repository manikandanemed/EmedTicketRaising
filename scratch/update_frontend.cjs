const fs = require('fs');

const filePath = 'src/pages/Projects.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to \n temporarily for matching if needed, or check
const isCRLF = code.includes('\r\n');
console.log('Frontend is CRLF:', isCRLF);

// 1. Update imports
const oldImport = `  Component,
  RefreshCw
} from 'lucide-react';`;

const newImport = `  Component,
  RefreshCw,
  Users,
  UserPlus,
  Check
} from 'lucide-react';`;

if (code.includes(oldImport)) {
  code = code.replace(oldImport, newImport);
  console.log('1. Imports updated');
} else {
  console.error('1. Imports not matched');
  process.exit(1);
}

// 2. Add member states
const oldStateAnchor = `  // Modals state
  const [showCreateProduct, setShowCreateProduct] = useState(false);`;

const newMemberStates = `  // Project Members state
  const [projectMembers, setProjectMembers] = useState<EmployeeDropdownDto[]>([]);
  const [loadingProjectMembers, setLoadingProjectMembers] = useState(false);
  const [showEditMembersModal, setShowEditMembersModal] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [savingMembers, setSavingMembers] = useState(false);
  const [managingMembersForProduct, setManagingMembersForProduct] = useState<ProductDto | null>(null);

  // Modals state
  const [showCreateProduct, setShowCreateProduct] = useState(false);`;

if (code.includes(oldStateAnchor)) {
  code = code.replace(oldStateAnchor, newMemberStates);
  console.log('2. States added');
} else {
  console.error('2. States anchor not matched');
  process.exit(1);
}

// 3. Add helper functions
const oldLoadProduct = `  // Load modules & clients for a selected product
  const loadProductDetails = async (product: ProductDto) => {
    setSelectedProduct(product);
    setWorkItemPage(1);
    setSelectedModuleId('all');
    setSelectedClientId('all');
    setSelectedClientModuleId('all');
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
  };`;

const newLoadProduct = `  const fetchProjectMembers = async (projectId: number) => {
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
        toast.success(\`Project members for "\${prod.name}" updated successfully!\`);
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
  };`;

if (code.includes(oldLoadProduct)) {
  code = code.replace(oldLoadProduct, newLoadProduct);
  console.log('3. Helper functions added');
} else {
  console.error('3. LoadProduct anchor not matched');
  process.exit(1);
}

// 4. In selectedProduct header: Add "Manage Members" button next to "Hierarchy Setup"
const oldHeaderButtons = `                      <button 
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
                      </button>`;

const newHeaderButtons = `                      <button 
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
                      )}`;

if (code.includes(oldHeaderButtons)) {
  code = code.replace(oldHeaderButtons, newHeaderButtons);
  console.log('4. Header button added');
} else {
  console.error('4. Header buttons anchor not matched');
  process.exit(1);
}

// 5. In selectedProduct stats card: Add Members stat and Team Members strip
const oldStatsCard = `              <div style={{ background: 'rgba(139, 122, 208, 0.05)', padding: '16px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                  <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Created:</span>
                  <span style={{ fontWeight: 600 }}>{new Date(selectedProduct.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>`;

const newStatsCard = `              <div style={{ background: 'rgba(139, 122, 208, 0.05)', padding: '16px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)' }}>
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
          </div>`;

if (code.includes(oldStatsCard)) {
  code = code.replace(oldStatsCard, newStatsCard);
  console.log('5. Stats card and member strip added');
} else {
  console.error('5. Stats card anchor not matched');
  process.exit(1);
}

// 6. In Products Table: Add "Members" button in Action column
const oldActionCol = `                            {isPM && (
                              <>
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
                                </button>`;

const newActionCol = `                            {isPM && (
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
                                </button>`;

if (code.includes(oldActionCol)) {
  code = code.replace(oldActionCol, newActionCol);
  console.log('6. Action column button added');
} else {
  console.error('6. Action column anchor not matched');
  process.exit(1);
}

// 7. Add Manage Project Members Modal before the last `</div>\n  );`
const modalMarkup = `
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
`;

const lastClosingDiv = '\n    </div>\n  );\n}';
if (code.includes(lastClosingDiv)) {
  code = code.replace(lastClosingDiv, `\n${modalMarkup}\n    </div>\n  );\n}`);
  console.log('7. Modal added successfully!');
} else {
  console.error('7. Closing div not matched');
  process.exit(1);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('All updates applied to src/pages/Projects.tsx!');
