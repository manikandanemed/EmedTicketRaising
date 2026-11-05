const fs = require('fs');

// 1. Update ProjectService.cs
const servicePath = '../Backend/TicketRaising-Backend/TeamTrack/Services/ProjectService.cs';
let serviceCode = fs.readFileSync(servicePath, 'utf8');

const oldGetProjectById = `        public async Task<ProjectResponseDto?> GetProjectByIdAsync(int projectId)
        {
            var project = await _projectRepo.Query()
                .Include(p => p.CreatedBy)
                .Include(p => p.AssignedEmployees)
                .Include(p => p.Client)
                .Include(p => p.WorkItems)
                    .ThenInclude(w => w.AssignedTo)
                .Include(p => p.WorkItems)
                    .ThenInclude(w => w.CreatedBy)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null) return null;
            return MapProjectToDto(project);
        }`.replace(/\n/g, '\r\n');

const newGetProjectById = `        public async Task<ProjectResponseDto?> GetProjectByIdAsync(int projectId)
        {
            var project = await _projectRepo.Query()
                .Include(p => p.CreatedBy)
                .Include(p => p.AssignedEmployees)
                .Include(p => p.Client)
                .Include(p => p.WorkItems)
                    .ThenInclude(w => w.AssignedTo)
                .Include(p => p.WorkItems)
                    .ThenInclude(w => w.CreatedBy)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null)
            {
                var product = await _productRepo.Query().FirstOrDefaultAsync(pr => pr.Id == projectId);
                if (product != null && product.ProjectId.HasValue && product.ProjectId.Value > 0)
                {
                    return await GetProjectByIdAsync(product.ProjectId.Value);
                }
            }

            if (project == null) return null;
            return MapProjectToDto(project);
        }`.replace(/\n/g, '\r\n');

const oldUpdateMembers = `        public async Task<ProjectResponseDto?> UpdateProjectMembersAsync(int projectId, UpdateProjectMembersRequestDto request)
        {
            var project = await _projectRepo.Query()
                .Include(p => p.AssignedEmployees)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null) return null;`.replace(/\n/g, '\r\n');

const newUpdateMembers = `        public async Task<ProjectResponseDto?> UpdateProjectMembersAsync(int projectId, UpdateProjectMembersRequestDto request)
        {
            var project = await _projectRepo.Query()
                .Include(p => p.AssignedEmployees)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null)
            {
                var product = await _productRepo.Query()
                    .Include(pr => pr.Project)
                        .ThenInclude(p => p.AssignedEmployees)
                    .FirstOrDefaultAsync(pr => pr.Id == projectId);

                if (product != null)
                {
                    if (product.ProjectId.HasValue && product.ProjectId.Value > 0)
                    {
                        project = await _projectRepo.Query()
                            .Include(p => p.AssignedEmployees)
                            .FirstOrDefaultAsync(p => p.Id == product.ProjectId.Value);
                    }

                    if (project == null)
                    {
                        var projectNumbers = await _projectRepo.Query().Select(p => p.ProjectNumber).ToListAsync();
                        var prjNumber = SequenceHelper.GenerateNextNumber(projectNumbers, "PRJ");
                        project = new Project
                        {
                            ProjectNumber = prjNumber,
                            Name = product.Name,
                            Description = product.Description,
                            Status = "active",
                            CreatedByUserId = 1,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        await _projectRepo.AddAsync(project);
                        await _projectRepo.SaveAsync();

                        product.ProjectId = project.Id;
                        await _productRepo.SaveAsync();
                    }
                }
            }

            if (project == null) return null;`.replace(/\n/g, '\r\n');

if (!serviceCode.includes(oldGetProjectById)) {
  console.error('Could not find oldGetProjectById in ProjectService.cs');
  process.exit(1);
}
if (!serviceCode.includes(oldUpdateMembers)) {
  console.error('Could not find oldUpdateMembers in ProjectService.cs');
  process.exit(1);
}

serviceCode = serviceCode.replace(oldGetProjectById, newGetProjectById);
serviceCode = serviceCode.replace(oldUpdateMembers, newUpdateMembers);
fs.writeFileSync(servicePath, serviceCode, 'utf8');
console.log('ProjectService.cs updated successfully!');

// 2. Update ProjectController.cs CreateProduct
const controllerPath = '../Backend/TicketRaising-Backend/TeamTrack/Controllers/ProjectController.cs';
let controllerCode = fs.readFileSync(controllerPath, 'utf8');

const oldCreateProductTarget = `            const int maxRetries = 10;
            for (int attempt = 0; attempt < maxRetries; attempt++)
            {
                var existingNumbers = await productRepo.Query().Select(p => p.ProductNumber).ToListAsync();
                var productNumber = SequenceHelper.GenerateNextNumber(existingNumbers, "PRD");

                var product = new Product
                {
                    ProductNumber = productNumber,
                    Name = request.Name.Trim(),
                    Description = request.Description?.Trim(),
                    ProjectId = request.ProjectId.HasValue && request.ProjectId.Value > 0 ? request.ProjectId : null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };`.replace(/\n/g, '\r\n');

const newCreateProductTarget = `            int? linkedProjectId = request.ProjectId.HasValue && request.ProjectId.Value > 0 ? request.ProjectId : null;
            if (!linkedProjectId.HasValue)
            {
                var existingPrjNumbers = await projectRepo.Query().Select(p => p.ProjectNumber).ToListAsync();
                var prjNumber = SequenceHelper.GenerateNextNumber(existingPrjNumbers, "PRJ");
                var currentUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var creatorUserId = !string.IsNullOrEmpty(currentUserIdClaim) ? int.Parse(currentUserIdClaim) : 1;
                var backingProject = new Project
                {
                    ProjectNumber = prjNumber,
                    Name = request.Name.Trim(),
                    Description = request.Description?.Trim(),
                    Status = "active",
                    CreatedByUserId = creatorUserId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await projectRepo.AddAsync(backingProject);
                await projectRepo.SaveAsync();
                linkedProjectId = backingProject.Id;
            }

            const int maxRetries = 10;
            for (int attempt = 0; attempt < maxRetries; attempt++)
            {
                var existingNumbers = await productRepo.Query().Select(p => p.ProductNumber).ToListAsync();
                var productNumber = SequenceHelper.GenerateNextNumber(existingNumbers, "PRD");

                var product = new Product
                {
                    ProductNumber = productNumber,
                    Name = request.Name.Trim(),
                    Description = request.Description?.Trim(),
                    ProjectId = linkedProjectId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };`.replace(/\n/g, '\r\n');

if (!controllerCode.includes(oldCreateProductTarget)) {
  console.error('Could not find oldCreateProductTarget in ProjectController.cs');
  process.exit(1);
}

controllerCode = controllerCode.replace(oldCreateProductTarget, newCreateProductTarget);
fs.writeFileSync(controllerPath, controllerCode, 'utf8');
console.log('ProjectController.cs updated successfully!');
