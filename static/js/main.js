// VJ Bus - Lost & Found Frontend Logic

// Hyderabad / VNRVJIET Central coordinates
const VNRVJIET_COORDS = [17.5376, 78.3862];

// Approximate coordinates for each route start/center to plot bus tracks on Leaflet Map
const ROUTE_LOCATIONS = {
    'Route-1 (Patancheru)': [17.5255, 78.2662],
    'Route-2 (LB Nagar)': [17.3457, 78.5522],
    'Route-2A (Nagole)': [17.4222, 78.5678],
    'Route-3 (Yusufguda)': [17.4363, 78.4312],
    'Route-4A (ECIL)': [17.4687, 78.5802],
    'Route-4B (ECIL)': [17.4687, 78.5802],
    'Route-5 (Attapur)': [17.3685, 78.4392],
    'Route-6 (VST)': [17.4116, 78.5034],
    'Route-7 (Kukatpally)': [17.4875, 78.3953],
    'Route-8 (Old Alwal)': [17.4983, 78.5098],
    'Route-9 (KPHB via Nizampet)': [17.4834, 78.3871],
    'Route-10 (Manikonda)': [17.4137, 78.3742],
    'Route-11 (HCU)': [17.4608, 78.3262],
    'Route-S-1 (Patancheru)': [17.5255, 78.2662],
    'Route-S-2/1 (LB Nagar)': [17.3457, 78.5522],
    'Route-S-2/2 (LB Nagar)': [17.3457, 78.5522],
    'Route-S-3/1 (Nagole via Begumpet)': [17.4222, 78.5678],
    'Route-S-3/2 (Nagole via Tadbund)': [17.4222, 78.5678],
    'Route-S-4 (Yusufguda)': [17.4363, 78.4312],
    'Route-S-5 (Attapur)': [17.3685, 78.4392],
    'Route-S-6 (VST)': [17.4116, 78.5034],
    'Route-S-7 (Kukatpally)': [17.4875, 78.3953],
    'Route-S-8 (KPHB via Nizampet)': [17.4834, 78.3871],
    'Route-S-9 (Manikonda)': [17.4137, 78.3742],
    'Route-S-10 (HCU)': [17.4608, 78.3262],
    'Route-41 (ECIL)': [17.4687, 78.5802],
    'Route-42 (ECIL)': [17.4687, 78.5802],
    'Route-43 (ECIL)': [17.4687, 78.5802],
    'Route-44 (ECIL)': [17.4687, 78.5802]
};

// Global pagination/state helper for Homepage
let homeState = {
    type: 'lost', // 'lost' or 'found'
    status: 'all',
    category: 'all',
    route: 'all',
    search: '',
    page: 1,
    perPage: 6
};

// Toast notification helper
function showToast(message, type = 'info') {
    let container = document.getElementById('notification-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-vj toast-vj-${type}`;
    
    let iconClass = 'bi-info-circle-fill';
    if (type === 'success') iconClass = 'bi-check-circle-fill';
    if (type === 'error') iconClass = 'bi-exclamation-triangle-fill';
    
    toast.innerHTML = `
        <i class="bi ${iconClass}"></i>
        <div>${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Format Date string nicely
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (e) {
        return dateStr;
    }
}

// ----------------------------------------------------
// HOMEPAGE FUNCTIONALITY
// ----------------------------------------------------
function initHomepage() {
    loadItems();
    loadStats();
    setupFilters();
    setupSocketIO();
}

// Fetch all items according to active filters and page
function loadItems() {
    const listElement = document.getElementById('items-list-container');
    const paginationElement = document.getElementById('pagination-container');
    const spinner = document.getElementById('loading-spinner');
    
    if (!listElement) return;
    
    // Show spinner
    spinner.style.display = 'block';
    listElement.innerHTML = '';
    paginationElement.innerHTML = '';
    
    const queryParams = new URLSearchParams({
        type: homeState.type,
        status: homeState.status,
        category: homeState.category,
        route: homeState.route,
        search: homeState.search,
        page: homeState.page,
        per_page: homeState.perPage
    });
    
    fetch(`/api/items?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            spinner.style.display = 'none';
            if (data.items.length === 0) {
                listElement.innerHTML = `
                    <div class="col-12 text-center py-5 text-muted">
                        <i class="bi bi-search-heart display-1 opacity-25"></i>
                        <p class="mt-3 fs-5">No reports found matching your criteria.</p>
                    </div>
                `;
                return;
            }
            
            data.items.forEach(item => {
                const card = createItemCard(item);
                listElement.appendChild(card);
            });
            
            renderPagination(data);
        })
        .catch(err => {
            spinner.style.display = 'none';
            console.error('Error fetching items:', err);
            showToast('Failed to load item lists.', 'error');
        });
}

// Load statistics from database (Helper counts)
function loadStats() {
    fetch('/api/items?per_page=1000&type=all&status=all')
        .then(r => r.json())
        .then(data => {
            let lost = 0;
            let found = 0;
            let returned = 0;
            
            data.items.forEach(item => {
                if (item.status === 'Returned') returned++;
                else if (item.type === 'lost') lost++;
                else if (item.type === 'found') found++;
            });
            
            const lVal = document.getElementById('stat-lost-val');
            const fVal = document.getElementById('stat-found-val');
            const rVal = document.getElementById('stat-returned-val');
            
            if (lVal) lVal.innerText = lost;
            if (fVal) fVal.innerText = found;
            if (rVal) rVal.innerText = returned;
        });
}

// Generate the item card HTML element
function createItemCard(item) {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4';
    
    const isLost = item.type === 'lost';
    const badgeTypeClass = isLost ? 'badge-lost' : 'badge-found';
    const badgeTypeText = isLost ? 'Lost Item' : 'Found Item';
    
    const statusClass = `status-${item.status.toLowerCase().replace(/ /g, '-')}`;
    
    const imageHTML = item.image 
        ? `<img src="/uploads/${item.image}" alt="${item.item_name}">`
        : `<div class="card-image-placeholder"><i class="bi bi-box-seam"></i></div>`;
        
    const dateFormatted = formatDate(item.date);
    const timeFormatted = item.time || 'N/A';
    const seatText = item.seat_number ? `Seat: ${item.seat_number}` : 'Seat: N/A';
    
    // Claim button only visible for Open found items
    const showClaimBtn = item.type === 'found' && item.status === 'Open';
    const claimButtonHTML = showClaimBtn
        ? `<button class="btn btn-vj-accent btn-sm flex-grow-1" onclick="openClaimModal(${item.id}, '${item.item_name.replace(/'/g, "\\'")}')">
             <i class="bi bi-check2-square"></i> Claim Item
           </button>`
        : '';
        
    col.innerHTML = `
        <div class="card-item">
            <div class="card-image-wrapper">
                ${imageHTML}
                <span class="badge-type ${badgeTypeClass}">${badgeTypeText}</span>
            </div>
            <div class="card-body-vj">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="card-category">${item.category}</span>
                    <span class="badge-status ${statusClass}">${item.status}</span>
                </div>
                <h4 class="card-title-vj">${item.item_name}</h4>
                <div class="card-details-grid">
                    <div class="detail-item"><i class="bi bi-bus-front"></i> <span>${item.bus_route}</span></div>
                    <div class="detail-item"><i class="bi bi-grid-3x3-gap"></i> <span>${seatText}</span></div>
                    <div class="detail-item"><i class="bi bi-calendar3"></i> <span>${dateFormatted}</span></div>
                    <div class="detail-item"><i class="bi bi-clock"></i> <span>${timeFormatted}</span></div>
                </div>
                <p class="card-description">${item.description || 'No description provided.'}</p>
                <div class="text-muted small mb-3">
                    <i class="bi bi-person"></i> Reported by: ${item.student_name}
                </div>
                <div class="card-footer-vj">
                    <a href="/view-item/${item.id}" class="btn btn-vj-primary btn-sm flex-grow-1">
                        <i class="bi bi-eye"></i> View Details
                    </a>
                    ${claimButtonHTML}
                </div>
            </div>
        </div>
    `;
    return col;
}

// Dynamic rendering of Pagination items
function renderPagination(data) {
    const paginationElement = document.getElementById('pagination-container');
    if (!paginationElement || data.pages <= 1) return;
    
    let html = '';
    
    // Previous button
    html += `<li class="page-item ${data.has_prev ? '' : 'disabled'}">
                <a class="page-link" href="#" onclick="changePage(${data.page - 1}); return false;">Previous</a>
             </li>`;
             
    // Pages numbers
    for (let i = 1; i <= data.pages; i++) {
        html += `<li class="page-item ${data.page === i ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                 </li>`;
    }
    
    // Next button
    html += `<li class="page-item ${data.has_next ? '' : 'disabled'}">
                <a class="page-link" href="#" onclick="changePage(${data.page + 1}); return false;">Next</a>
             </li>`;
             
    paginationElement.innerHTML = `<ul class="pagination justify-content-center m-0">${html}</ul>`;
}

// Change Page helper
window.changePage = function(pageNumber) {
    homeState.page = pageNumber;
    loadItems();
    // Scroll smoothly to list container
    document.getElementById('search-filters-section').scrollIntoView({ behavior: 'smooth' });
};

// Setup Filters change handlers
function setupFilters() {
    // Type tab switcher
    const tabLost = document.getElementById('tab-lost');
    const tabFound = document.getElementById('tab-found');
    
    if (tabLost && tabFound) {
        tabLost.addEventListener('click', (e) => {
            e.preventDefault();
            tabLost.classList.add('active');
            tabFound.classList.remove('active');
            homeState.type = 'lost';
            homeState.page = 1;
            loadItems();
        });
        tabFound.addEventListener('click', (e) => {
            e.preventDefault();
            tabFound.classList.add('active');
            tabLost.classList.remove('active');
            homeState.type = 'found';
            homeState.page = 1;
            loadItems();
        });
    }
    
    // Form Filters
    const searchInput = document.getElementById('search-input');
    const filterRoute = document.getElementById('filter-route');
    const filterCategory = document.getElementById('filter-category');
    const filterStatus = document.getElementById('filter-status');
    
    if (searchInput) {
        // Instant search (debounce/input event)
        searchInput.addEventListener('input', (e) => {
            homeState.search = e.target.value;
            homeState.page = 1;
            loadItems();
        });
    }
    
    if (filterRoute) {
        filterRoute.addEventListener('change', (e) => {
            homeState.route = e.target.value;
            homeState.page = 1;
            loadItems();
        });
    }
    
    if (filterCategory) {
        filterCategory.addEventListener('change', (e) => {
            homeState.category = e.target.value;
            homeState.page = 1;
            loadItems();
        });
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', (e) => {
            homeState.status = e.target.value;
            homeState.page = 1;
            loadItems();
        });
    }
}

// Setup Socket.IO dynamic listeners
function setupSocketIO() {
    if (typeof io !== 'undefined') {
        const socket = io();
        
        socket.on('connect', () => {
            console.log('SocketIO connected for real-time tracking.');
        });
        
        socket.on('item_update', (data) => {
            // Live notifications
            if (data.action === 'create') {
                showToast(`New ${data.item.type} item reported: "${data.item.item_name}"!`, 'info');
            } else if (data.action === 'update') {
                showToast(`Item "${data.item.item_name}" was updated to "${data.item.status}"!`, 'success');
            }
            // Reload dashboard metrics & lists
            loadStats();
            loadItems();
        });
    }
}

// ----------------------------------------------------
// CLAIM COMPONENT
// ----------------------------------------------------
let activeClaimItemId = null;
window.openClaimModal = function(itemId, itemName) {
    activeClaimItemId = itemId;
    const modalTitle = document.getElementById('claimModalLabel');
    if (modalTitle) {
        modalTitle.innerText = `Submit Claim: ${itemName}`;
    }
    const claimModal = new bootstrap.Modal(document.getElementById('claimModal'));
    claimModal.show();
};

window.submitClaim = function() {
    const name = document.getElementById('claim-name').value.trim();
    const roll = document.getElementById('claim-roll').value.trim();
    const phone = document.getElementById('claim-phone').value.trim();
    const reason = document.getElementById('claim-reason').value.trim();
    
    if (!name || !roll || !phone || !reason) {
        showToast('Please fill out all claim details.', 'error');
        return;
    }
    
    if (!/^\d+$/.test(phone)) {
        showToast('Phone number must contain only digits.', 'error');
        return;
    }
    
    fetch(`/api/claim/${activeClaimItemId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            claimer_name: name,
            claimer_roll_number: roll,
            claimer_mobile: phone,
            claimer_reason: reason
        })
    })
    .then(r => r.json().then(data => ({ status: r.status, body: data })))
    .then(res => {
        if (res.status === 200) {
            showToast('Claim request submitted successfully!', 'success');
            // Hide Bootstrap Modal
            const modalEl = document.getElementById('claimModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
            
            // Clear fields
            document.getElementById('claim-form').reset();
            
            // Reload list
            loadItems();
            loadStats();
        } else {
            showToast(res.body.error || 'Failed to submit claim.', 'error');
        }
    })
    .catch(err => {
        console.error('Error claiming:', err);
        showToast('Server error during claim request.', 'error');
    });
};

// ----------------------------------------------------
// REPORT FORM COMPONENT
// ----------------------------------------------------
function initReportForm(type) {
    const form = document.getElementById(`report-${type}-form`);
    const fileInput = document.getElementById('item-image');
    const previewBox = document.getElementById('image-preview');
    
    if (fileInput && previewBox) {
        // Setup visual trigger
        previewBox.addEventListener('click', () => fileInput.click());
        
        // Image preview change handler
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Size Validation (5 MB)
                if (file.size > 5 * 1024 * 1024) {
                    showToast('Image size exceeds 5MB limit.', 'error');
                    fileInput.value = '';
                    previewBox.innerHTML = `
                        <i class="bi bi-cloud-arrow-up display-4 opacity-50"></i>
                        <p class="mt-2 text-muted">Upload Image (Optional)</p>
                        <p class="small text-danger">Max size 5 MB</p>
                    `;
                    return;
                }
                
                // Extension Validation
                const ext = file.name.split('.').pop().toLowerCase();
                if (!['png', 'jpg', 'jpeg'].includes(ext)) {
                    showToast('Invalid file format. Only JPG, JPEG, and PNG are allowed.', 'error');
                    fileInput.value = '';
                    previewBox.innerHTML = `
                        <i class="bi bi-cloud-arrow-up display-4 opacity-50"></i>
                        <p class="mt-2 text-muted">Upload Image (Optional)</p>
                        <p class="small text-danger">Only JPG, JPEG, PNG</p>
                    `;
                    return;
                }
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(event) {
                    previewBox.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Client validations
            const phoneField = form.querySelector('[name="mobile"]');
            const emailField = form.querySelector('[name="email"]');
            const itemField = form.querySelector('[name="item_name"]');
            
            if (itemField && itemField.value.trim() === '') {
                showToast('Item Name is required.', 'error');
                return;
            }
            
            if (phoneField && !/^\d+$/.test(phoneField.value.trim())) {
                showToast('Phone number must contain only digits.', 'error');
                return;
            }
            
            if (emailField && (!emailField.value.includes('@') || !emailField.value.includes('.'))) {
                showToast('Please enter a valid email address.', 'error');
                return;
            }
            
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';
            
            const formData = new FormData(form);
            const endpoint = type === 'lost' ? '/api/lost-item' : '/api/found-item';
            
            fetch(endpoint, {
                method: 'POST',
                body: formData
            })
            .then(r => r.json().then(data => ({ status: r.status, body: data })))
            .then(res => {
                if (res.status === 201) {
                    showToast(res.body.message, 'success');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);
                } else {
                    showToast(res.body.error || 'Failed to submit report.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Submit Report';
                }
            })
            .catch(err => {
                console.error('Error submitting form:', err);
                showToast('Server error while submitting form.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit Report';
            });
        });
    }
}

// ----------------------------------------------------
// DETAILS VIEW COMPONENT WITH LEAFLET MAPS
// ----------------------------------------------------
function initViewDetails(itemId) {
    const detailsContainer = document.getElementById('details-content');
    
    if (!detailsContainer) return;
    
    fetch(`/api/item/${itemId}`)
        .then(response => {
            if (!response.ok) throw new Error('Item not found');
            return response.json();
        })
        .then(item => {
            renderItemDetails(item);
            setupLeafletMap(item);
        })
        .catch(err => {
            console.error('Error loading details:', err);
            detailsContainer.innerHTML = `
                <div class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle display-1"></i>
                    <p class="mt-3 fs-5">Report details could not be loaded. It might have been deleted or closed.</p>
                    <a href="/" class="btn btn-vj-primary mt-3">Back to Homepage</a>
                </div>
            `;
        });
}

function renderItemDetails(item) {
    const isLost = item.type === 'lost';
    const badgeTypeClass = isLost ? 'badge-lost' : 'badge-found';
    const badgeTypeText = isLost ? 'Lost Item' : 'Found Item';
    const statusClass = `status-${item.status.toLowerCase().replace(/ /g, '-')}`;
    
    const imageHTML = item.image 
        ? `<img src="/uploads/${item.image}" class="img-fluid rounded border shadow-sm w-100" style="max-height: 400px; object-fit: contain;" alt="${item.item_name}">`
        : `<div class="d-flex align-items-center justify-content-center bg-light rounded border w-100" style="height: 300px; color: var(--text-muted);">
             <div class="text-center">
                <i class="bi bi-box-seam display-1 opacity-25"></i>
                <p class="mt-2">No photo available</p>
             </div>
           </div>`;
           
    const container = document.getElementById('details-content');
    
    // Claim details HTML if claimed/returned
    let claimerInfoHTML = '';
    if (item.claimer_name) {
        claimerInfoHTML = `
            <div class="card border-warning mt-4">
                <div class="card-header bg-warning text-dark font-weight-bold">
                    <i class="bi bi-info-circle-fill"></i> Claim Request Information
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-sm-6 mb-2"><strong>Claimant Name:</strong> ${item.claimer_name}</div>
                        <div class="col-sm-6 mb-2"><strong>Claimant Roll:</strong> ${item.claimer_roll_number}</div>
                        <div class="col-sm-6 mb-2"><strong>Claimant Mobile:</strong> ${item.claimer_mobile}</div>
                        <div class="col-sm-12"><strong>Reason for Claim:</strong><p class="bg-light p-2 rounded mb-0 mt-1">${item.claimer_reason}</p></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Render claim button for open found items
    const showClaimBtn = item.type === 'found' && item.status === 'Open';
    const claimButtonHTML = showClaimBtn
        ? `<button class="btn btn-vj-accent btn-lg w-100 mt-3" onclick="openClaimModal(${item.id}, '${item.item_name.replace(/'/g, "\\'")}')">
             <i class="bi bi-check2-square"></i> Claim Found Item
           </button>`
        : '';
        
    container.innerHTML = `
        <div class="row">
            <div class="col-lg-6 mb-4">
                ${imageHTML}
                ${claimButtonHTML}
                ${claimerInfoHTML}
            </div>
            <div class="col-lg-6">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="badge-status ${statusClass} fs-6 px-3 py-2">${item.status}</span>
                    <span class="badge-status ${badgeTypeClass} fs-6 px-3 py-2">${badgeTypeText}</span>
                </div>
                <h2 class="mb-3">${item.item_name}</h2>
                <h6 class="text-muted text-uppercase mb-4">Category: ${item.category}</h6>
                
                <div class="table-responsive">
                    <table class="table table-striped table-bordered align-middle">
                        <tbody>
                            <tr>
                                <th width="35%"><i class="bi bi-bus-front text-primary me-2"></i>Bus Route</th>
                                <td>${item.bus_route}</td>
                            </tr>
                            <tr>
                                <th><i class="bi bi-grid-3x3-gap text-primary me-2"></i>Seat Number</th>
                                <td>${item.seat_number || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th><i class="bi bi-calendar3 text-primary me-2"></i>Date</th>
                                <td>${formatDate(item.date)}</td>
                            </tr>
                            <tr>
                                <th><i class="bi bi-clock text-primary me-2"></i>Approx. Time</th>
                                <td>${item.time || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th><i class="bi bi-person-badge text-primary me-2"></i>Reported By</th>
                                <td>${item.student_name} (${item.roll_number})</td>
                            </tr>
                            <tr>
                                <th><i class="bi bi-telephone text-primary me-2"></i>Contact Mobile</th>
                                <td>${item.mobile}</td>
                            </tr>
                            <tr>
                                <th><i class="bi bi-envelope text-primary me-2"></i>Contact Email</th>
                                <td><a href="mailto:${item.email}">${item.email}</a></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <h5 class="mt-4"><i class="bi bi-card-text text-primary me-2"></i>Description</h5>
                <p class="bg-light p-3 rounded border text-muted">${item.description || 'No detailed description available.'}</p>
                
                <h5 class="mt-4 mb-2"><i class="bi bi-geo-alt text-primary me-2"></i>Bus Route Track</h5>
                <p class="small text-muted mb-2">This map tracks the route start coordinate and shows the path to VNRVJIET college campus.</p>
                <div id="leaflet-route-map"></div>
            </div>
        </div>
    `;
}

function setupLeafletMap(item) {
    const mapElement = document.getElementById('leaflet-route-map');
    if (!mapElement || typeof L === 'undefined') return;
    
    // Check if the route location coordinates exist. 
    // Fallback to coordinates near college if route doesn't match
    const routeCoords = ROUTE_LOCATIONS[item.bus_route] || [17.5000, 78.4000];
    
    // Initialize Leaflet Map
    const map = L.map('leaflet-route-map').setView(VNRVJIET_COORDS, 11);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    // Icons
    const collegeIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    
    const routeIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    
    // Put college marker
    L.marker(VNRVJIET_COORDS, { icon: collegeIcon })
        .addTo(map)
        .bindPopup("<b>VNRVJIET College Campus</b><br>Bus Destination")
        .openPopup();
        
    // Put Route starting marker
    L.marker(routeCoords, { icon: routeIcon })
        .addTo(map)
        .bindPopup(`<b>${item.bus_route} Start/Reference</b>`);
        
    // Draw route path line
    const pathPoints = [routeCoords, VNRVJIET_COORDS];
    const polyline = L.polyline(pathPoints, { 
        color: '#1e3c72', 
        weight: 4, 
        opacity: 0.7, 
        dashArray: '8, 8' 
    }).addTo(map);
    
    // Zoom map to fit both markers
    const group = new L.featureGroup([
        L.marker(VNRVJIET_COORDS),
        L.marker(routeCoords)
    ]);
    map.fitBounds(group.getBounds().pad(0.15));
}

// ----------------------------------------------------
// ADMIN DASHBOARD COMPONENT
// ----------------------------------------------------
let adminState = {
    status: 'all',
    type: 'all',
    search: ''
};

function initAdminDashboard() {
    loadAdminItems();
    
    // Setup filter listeners
    const statusSelect = document.getElementById('admin-filter-status');
    const typeSelect = document.getElementById('admin-filter-type');
    const searchInput = document.getElementById('admin-search');
    
    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            adminState.status = e.target.value;
            loadAdminItems();
        });
    }
    
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            adminState.type = e.target.value;
            loadAdminItems();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            adminState.search = e.target.value;
            loadAdminItems();
        });
    }
}

function loadAdminItems() {
    const tableBody = document.getElementById('admin-table-body');
    const spinner = document.getElementById('admin-loading-spinner');
    
    if (!tableBody) return;
    
    spinner.style.display = 'block';
    tableBody.innerHTML = '';
    
    // Get all records (using per_page=500 to fetch full list for administration simplicity)
    const queryParams = new URLSearchParams({
        type: adminState.type,
        status: adminState.status,
        search: adminState.search,
        per_page: 500
    });
    
    fetch(`/api/items?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            spinner.style.display = 'none';
            if (data.items.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center text-muted py-5">
                            <i class="bi bi-shield-slash display-4 opacity-50"></i>
                            <p class="mt-2">No reports matching the filters.</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            data.items.forEach(item => {
                const tr = createAdminRow(item);
                tableBody.appendChild(tr);
            });
        })
        .catch(err => {
            spinner.style.display = 'none';
            console.error('Error fetching admin reports:', err);
            showToast('Failed to load reports for moderation.', 'error');
        });
}

function createAdminRow(item) {
    const tr = document.createElement('tr');
    
    const isLost = item.type === 'lost';
    const badgeTypeHTML = isLost 
        ? `<span class="badge bg-danger">LOST</span>` 
        : `<span class="badge bg-success">FOUND</span>`;
        
    const statusClass = `status-${item.status.toLowerCase().replace(/ /g, '-')}`;
    const statusBadgeHTML = `<span class="badge-status ${statusClass}">${item.status}</span>`;
    
    const actionButtons = getAdminActionButtons(item);
    
    // Image thumbnail
    const thumbHTML = item.image 
        ? `<img src="/uploads/${item.image}" alt="${item.item_name}" class="rounded border" style="width: 50px; height: 50px; object-fit: cover;">`
        : `<div class="d-flex align-items-center justify-content-center bg-light border rounded" style="width: 50px; height: 50px; color: var(--text-muted);"><i class="bi bi-box-seam"></i></div>`;
        
    tr.innerHTML = `
        <td class="text-center">${item.id}</td>
        <td class="text-center">${thumbHTML}</td>
        <td>${badgeTypeHTML}</td>
        <td><strong>${item.item_name}</strong><br><small class="text-muted">${item.category}</small></td>
        <td>${item.bus_route}<br><small class="text-muted">Seat: ${item.seat_number || 'N/A'}</small></td>
        <td>${formatDate(item.date)}<br><small class="text-muted">${item.time || 'N/A'}</small></td>
        <td>
            ${item.student_name}<br>
            <small class="text-muted">${item.roll_number} | <a href="tel:${item.mobile}">${item.mobile}</a></small>
        </td>
        <td>${statusBadgeHTML}</td>
        <td>
            <div class="d-flex gap-1 flex-wrap">
                <a href="/view-item/${item.id}" class="btn btn-sm btn-outline-primary" title="View details"><i class="bi bi-eye"></i></a>
                ${actionButtons}
            </div>
        </td>
    `;
    return tr;
}

function getAdminActionButtons(item) {
    let btns = '';
    
    // Actions based on status
    if (item.status === 'Open') {
        // Option to mark returned directly
        btns += `<button class="btn btn-sm btn-success" onclick="adminMarkReturned(${item.id})" title="Mark Returned"><i class="bi bi-check-circle"></i></button>`;
        // Option to close
        btns += `<button class="btn btn-sm btn-secondary" onclick="adminUpdateStatus(${item.id}, 'Closed')" title="Close Report"><i class="bi bi-slash-circle"></i></button>`;
    }
    
    if (item.status === 'Claim Requested') {
        // Option to Approve Claim (sets to Returned or Closed)
        btns += `<button class="btn btn-sm btn-success" onclick="adminMarkReturned(${item.id})" title="Approve Claim & Return"><i class="bi bi-check-circle"></i> Approve</button>`;
        // Option to Reject Claim (sets back to Open)
        btns += `<button class="btn btn-sm btn-warning" onclick="adminUpdateStatus(${item.id}, 'Open')" title="Reject Claim & Open"><i class="bi bi-x-circle"></i> Reject</button>`;
    }
    
    if (item.status === 'Closed' || item.status === 'Returned') {
        // Reopen report option
        btns += `<button class="btn btn-sm btn-info text-white" onclick="adminUpdateStatus(${item.id}, 'Open')" title="Reopen Report"><i class="bi bi-arrow-counterclockwise"></i></button>`;
    }
    
    // Option to Delete report (with confirmation check)
    btns += `<button class="btn btn-sm btn-danger" onclick="adminDeleteReport(${item.id})" title="Delete Report"><i class="bi bi-trash"></i></button>`;
    
    return btns;
}

window.adminMarkReturned = function(itemId) {
    fetch(`/api/return/${itemId}`, { method: 'PUT' })
        .then(response => response.json())
        .then(data => {
            showToast('Item marked as returned!', 'success');
            loadAdminItems();
        })
        .catch(err => {
            console.error('Error status update:', err);
            showToast('Failed to mark returned.', 'error');
        });
};

window.adminUpdateStatus = function(itemId, newStatus) {
    fetch(`/api/item/${itemId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        showToast(`Report status updated to "${newStatus}"!`, 'success');
        loadAdminItems();
    })
    .catch(err => {
        console.error('Error status update:', err);
        showToast('Failed to update status.', 'error');
    });
};

window.adminDeleteReport = function(itemId) {
    if (confirm('WARNING: Are you sure you want to permanently delete this report? This action cannot be undone.')) {
        fetch(`/api/item/${itemId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                showToast('Report deleted successfully.', 'success');
                loadAdminItems();
            })
            .catch(err => {
                console.error('Error deleting report:', err);
                showToast('Failed to delete report.', 'error');
            });
    }
};
