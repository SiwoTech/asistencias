// Módulo de Nómina
class NominaModule {
    constructor() {
        this.baseURL = window.location.origin + '/asistencias/php/api';
        this.periodos = [];
        this.nominaActual = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.generatePeriodos();
    }

    setupEventListeners() {
        const periodoSelect = document.getElementById('periodo-select');
        if (periodoSelect) {
            periodoSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadNominaPeriodo(e.target.value);
                }
            });
        }
    }

    generatePeriodos() {
        const periodoSelect = document.getElementById('periodo-select');
        if (!periodoSelect) return;

        periodoSelect.innerHTML = '<option value="">Seleccionar período...</option>';
        
        // Generar últimas 12 semanas
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - (i * 7));
            
            const year = date.getFullYear();
            const week = this.getWeekNumber(date);
            const periodo = `${year}-${week.toString().padStart(2, '0')}`;
            
            const weekDates = this.getWeekDates(year, week);
            const option = document.createElement('option');
            option.value = periodo;
            option.textContent = `Semana ${week} ${year} (${this.formatDate(weekDates.start)} - ${this.formatDate(weekDates.end)})`;
            
            periodoSelect.appendChild(option);
        }
    }

    async loadNominaData() {
        // Cargar período actual por defecto
        const currentPeriod = this.getCurrentWeek();
        const periodoSelect = document.getElementById('periodo-select');
        if (periodoSelect) {
            periodoSelect.value = currentPeriod;
            await this.loadNominaPeriodo(currentPeriod);
        }
    }

    async loadNominaPeriodo(periodo) {
        try {
            console.log('Cargando nómina desde:', `${this.baseURL}/nomina.php?periodo=${periodo}`);
            
            const response = await fetch(`${this.baseURL}/nomina.php?periodo=${periodo}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.nominaActual = data.data.nomina || [];
                this.updateNominaTable();
                this.updateNominaSummary(data.data.resumen || {});
            } else {
                this.showNotification('Error al cargar nómina: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error loading nomina:', error);
            this.showNotification('Error de conexión al cargar nómina: ' + error.message, 'error');
        }
    }

    updateNominaTable() {
        const tbody = document.querySelector('#tabla-nomina tbody');
        if (!tbody) return;

        if (this.nominaActual.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay nómina generada para este período</td></tr>';
            return;
        }

        tbody.innerHTML = this.nominaActual.map(nomina => {
            const estadoBadge = nomina.pagado ? 
                '<span class="badge badge-success"><i class="fas fa-check"></i> Pagado</span>' :
                '<span class="badge badge-warning"><i class="fas fa-clock"></i> Pendiente</span>';

            return `
                <tr>
                    <td>${nomina.empleado_nombre}</td>
                    <td>${this.formatMoney(nomina.salario_base)}</td>
                    <td class="text-center">${nomina.dias_trabajados}</td>
                    <td class="text-center">${nomina.faltas}</td>
                    <td>${this.formatMoney(nomina.descuento_faltas)}</td>
                    <td>${this.formatMoney(nomina.comisiones)}</td>
                    <td class="fw-bold">${this.formatMoney(nomina.total_nomina)}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="nominaModule.verDetalleNomina(${nomina.id})" title="Ver detalle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="nominaModule.imprimirRecibo(${nomina.id})" title="Imprimir recibo">
                            <i class="fas fa-print"></i>
                        </button>
                        ${!nomina.pagado ? `
                            <button class="btn btn-sm btn-success" onclick="nominaModule.marcarPagado(${nomina.id})" title="Marcar como pagado">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateNominaSummary(resumen) {
        const summaryDiv = document.getElementById('nomina-summary');
        if (!summaryDiv) return;

        summaryDiv.innerHTML = `
            <h3>Resumen de Nómina</h3>
            <div class="summary-stats">
                <div class="summary-stat">
                    <h4>${resumen.total_empleados || 0}</h4>
                    <p>Empleados</p>
                </div>
                <div class="summary-stat">
                    <h4>${this.formatMoney(resumen.total_salarios || 0)}</h4>
                    <p>Total Salarios</p>
                </div>
                <div class="summary-stat">
                    <h4>${this.formatMoney(resumen.total_comisiones || 0)}</h4>
                    <p>Total Comisiones</p>
                </div>
                <div class="summary-stat">
                    <h4>${this.formatMoney(resumen.total_descuentos || 0)}</h4>
                    <p>Total Descuentos</p>
                </div>
                <div class="summary-stat">
                    <h4>${this.formatMoney(resumen.total_nomina || 0)}</h4>
                    <p>Total Nómina</p>
                </div>
            </div>
        `;
    }

    async generarNominaPeriodo() {
        const periodoSelect = document.getElementById('periodo-select');
        if (!periodoSelect || !periodoSelect.value) {
            this.showNotification('Debe seleccionar un período', 'warning');
            return;
        }

        const periodo = periodoSelect.value;
        
        if (!confirm(`¿Está seguro de generar la nómina para el período ${periodo}?`)) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/nomina.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    accion: 'generar',
                    periodo: periodo 
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                await this.loadNominaPeriodo(periodo);
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error generating nomina:', error);
            this.showNotification('Error al generar nómina', 'error');
        }
    }

    async generarNominaSemanal() {
        const currentPeriod = this.getCurrentWeek();
        const periodoSelect = document.getElementById('periodo-select');
        if (periodoSelect) {
            periodoSelect.value = currentPeriod;
        }
        await this.generarNominaPeriodo();
    }

    // Resto de métodos con rutas corregidas...
    async verDetalleNomina(nominaId) {
        try {
            const response = await fetch(`${this.baseURL}/nomina.php?id=${nominaId}&detalle=1`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.mostrarModalDetalle(data.data);
            } else {
                this.showNotification('Error al cargar detalle', 'error');
            }
        } catch (error) {
            console.error('Error loading nomina detail:', error);
            this.showNotification('Error de conexión', 'error');
        }
    }

    // Utilidades
    getCurrentWeek() {
        const now = new Date();
        const year = now.getFullYear();
        const week = this.getWeekNumber(now);
        return `${year}-${week.toString().padStart(2, '0')}`;
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    getWeekDates(year, week) {
        const date = new Date(year, 0, 1 + (week - 1) * 7);
        const dayOfWeek = date.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        const monday = new Date(date);
        monday.setDate(date.getDate() + mondayOffset);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        return {
            start: monday.toISOString().split('T')[0],
            end: sunday.toISOString().split('T')[0]
        };
    }

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

// Inicializar módulo
document.addEventListener('DOMContentLoaded', () => {
    window.nominaModule = new NominaModule();
});

// Exponer la función globalmente
window.generarNominaPeriodo = () => {
    if (window.nominaModule) {
        window.nominaModule.generarNominaPeriodo();
    } else {
        console.error("El módulo NominaModule no está inicializado.");
    }
};