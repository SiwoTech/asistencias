// Módulo de Reportes
class ReportesModule {
    constructor() {
        this.baseURL = window.location.origin + '/asistencias/php/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDateDefaults();
    }

    setupEventListeners() {
        // Los event listeners se manejarán a través de las funciones globales
    }

    setupDateDefaults() {
        const fechaInicio = document.getElementById('fecha-inicio');
        const fechaFin = document.getElementById('fecha-fin');
        
        if (fechaInicio && fechaFin) {
            // Establecer fechas por defecto (último mes)
            const today = new Date();
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            
            fechaInicio.value = lastMonth.toISOString().split('T')[0];
            fechaFin.value = today.toISOString().split('T')[0];
        }
    }

    async loadReportesData() {
        // Cargar empleados para el selector de reportes
        if (window.empleadosModule) {
            await window.empleadosModule.loadEmpleados();
        }
    }

    async generarReporteAsistencia() {
        const fechaInicio = document.getElementById('fecha-inicio')?.value;
        const fechaFin = document.getElementById('fecha-fin')?.value;
        const empleadoId = document.getElementById('empleado-reporte')?.value;

        if (!fechaInicio || !fechaFin) {
            this.showNotification('Debe seleccionar las fechas de inicio y fin', 'warning');
            return;
        }

        try {
            let url = `${this.baseURL}/reportes.php?tipo=asistencia&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
            if (empleadoId) {
                url += `&empleado_id=${empleadoId}`;
            }

            console.log('Generando reporte desde:', url);

            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.mostrarReporteAsistencia(data.data);
            } else {
                this.showNotification('Error al generar reporte: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error generating attendance report:', error);
            this.showNotification('Error al generar reporte de asistencia: ' + error.message, 'error');
        }
    }

    mostrarReporteAsistencia(data) {
        const resultsDiv = document.getElementById('report-results');
        if (!resultsDiv) return;

        const { resumen, detalle } = data;

        resultsDiv.innerHTML = `
            <h3>Reporte de Asistencia</h3>
            
            <!-- Resumen -->
            <div class="report-summary">
                <h4>Resumen del Período</h4>
                <div class="summary-stats">
                    <div class="summary-stat">
                        <h4>${resumen.total_empleados}</h4>
                        <p>Empleados</p>
                    </div>
                    <div class="summary-stat">
                        <h4>${resumen.total_presencias}</h4>
                        <p>Presencias</p>
                    </div>
                    <div class="summary-stat">
                        <h4>${resumen.total_faltas}</h4>
                        <p>Faltas</p>
                    </div>
                    <div class="summary-stat">
                        <h4>${resumen.total_retardos}</h4>
                        <p>Retardos</p>
                    </div>
                    <div class="summary-stat">
                        <h4>${resumen.porcentaje_asistencia}%</h4>
                        <p>% Asistencia</p>
                    </div>
                </div>
            </div>

            <!-- Detalle -->
            <div class="report-detail">
                <div class="report-actions">
                    <button class="btn btn-primary" onclick="reportesModule.exportarReporte('asistencia', ${JSON.stringify(detalle).replace(/"/g, '&quot;')})">
                        <i class="fas fa-download"></i> Exportar Excel
                    </button>
                    <button class="btn btn-secondary" onclick="reportesModule.imprimirReporte('asistencia')">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                </div>
                
                <div class="table-responsive">
                    <table class="table" id="tabla-reporte-asistencia">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Días Trabajados</th>
                                <th>Faltas</th>
                                <th>Retardos</th>
                                <th>% Asistencia</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detalle.map(item => `
                                <tr>
                                    <td>${item.empleado_nombre}</td>
                                    <td class="text-center">${item.dias_trabajados}</td>
                                    <td class="text-center">${item.faltas}</td>
                                    <td class="text-center">${item.retardos}</td>
                                    <td class="text-center">
                                        <span class="badge ${item.porcentaje_asistencia >= 90 ? 'badge-success' : 
                                                            item.porcentaje_asistencia >= 80 ? 'badge-warning' : 'badge-danger'}">
                                            ${item.porcentaje_asistencia}%
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-info" onclick="reportesModule.verDetalleEmpleado(${item.empleado_id})">
                                            <i class="fas fa-eye"></i> Ver Detalle
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Resto de métodos con rutas corregidas...
    formatMoney(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    showNotification(message, type) {
        if (window.sistemaAsistencia) {
            window.sistemaAsistencia.showNotification(message, type);
        }
    }
}

// Funciones globales para compatibilidad
function generarReporteAsistencia() {
    window.reportesModule?.generarReporteAsistencia();
}

function generarReporteNomina() {
    window.reportesModule?.generarReporteNomina();
}

function generarReporteFaltas() {
    window.reportesModule?.generarReporteFaltas();
}

// Inicializar módulo
document.addEventListener('DOMContentLoaded', () => {
    window.reportesModule = new ReportesModule();
});