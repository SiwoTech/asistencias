// Birthday Manager Module
class BirthdayManager {
    constructor() {
        this.monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        this.currentMonth = new Date().getMonth();
        this.init();
    }

    init() {
        console.log('Birthday Manager initialized');
    }

    updateBirthdaySection(data) {
        console.log('Updating birthday section with data:', data);
        this.updateBirthdayToday(data.cumpleanos_hoy, data.cumpleanos_del_mes);
        this.updateBirthdayThisMonth(data.cumpleanos_del_mes, data.mes_actual);
        this.updateBirthdayStats(data.cumpleanos_hoy);
    }

    updateBirthdayToday(cumpleanosHoy, cumpleanosDelMes) {
        const container = document.getElementById('birthday-today');
        if (!container) {
            console.error('Birthday today container not found');
            return;
        }

        // Filtrar cumpleaños de hoy
        const birthdaysToday = cumpleanosDelMes.filter(b => b.when_cumple === 'hoy');

        if (birthdaysToday.length > 0) {
            container.innerHTML = this.generateTodayBirthdayHTML(birthdaysToday);
            
            // Reproducir sonido de cumpleaños (opcional)
            this.playBirthdaySound();
            
            // Mostrar confetti (opcional)
            this.showConfetti();
        } else {
            container.innerHTML = '';
        }
    }

    generateTodayBirthdayHTML(birthdays) {
        const names = birthdays.map(b => b.nombre_completo);
        const isPlural = birthdays.length > 1;
        
        return `
            <div class="birthday-alert">
                <div class="birthday-icon">
                    <i class="fas fa-birthday-cake"></i>
                </div>
                <div class="birthday-content">
                    <h4>🎉 ¡Feliz Cumpleaños${isPlural ? ' a todos' : ''}! 🎉</h4>
                    <p>Hoy ${isPlural ? 'cumplen años' : 'cumple años'}: <strong>${names.join(', ')}</strong></p>
                </div>
            </div>
        `;
    }

    updateBirthdayThisMonth(cumpleanos, mesActual) {
        const container = document.getElementById('birthday-list');
        const titleElement = document.querySelector('.birthday-this-month h3');
        
        if (!container) {
            console.error('Birthday list container not found');
            return;
        }

        // Actualizar título del mes
        if (titleElement && mesActual) {
            titleElement.innerHTML = `<i class="fas fa-birthday-cake"></i> Cumpleaños de ${mesActual.nombre} ${mesActual.año}`;
        }

        if (!cumpleanos || cumpleanos.length === 0) {
            container.innerHTML = `
                <div class="no-birthdays">
                    <i class="fas fa-calendar-times"></i>
                    <p>No hay cumpleaños este mes</p>
                </div>
            `;
            return;
        }

        container.innerHTML = cumpleanos.map(birthday => this.generateBirthdayItemHTML(birthday)).join('');
    }

    generateBirthdayItemHTML(birthday) {
        const isToday = birthday.when_cumple === 'hoy';
        const initials = this.getInitials(birthday.nombre_completo);
        const ageText = birthday.edad_cumple ? `${birthday.edad_cumple} años` : '';
        
        // Formatear fecha
        const date = new Date(birthday.fecha_nacimiento + 'T00:00:00');
        const day = date.getDate();
        const month = this.monthNames[date.getMonth()].substring(0, 3).toUpperCase();
        
        let statusText = '';
        if (isToday) {
            statusText = '¡Hoy cumple años!';
        } else if (birthday.dias_para_cumple > 0) {
            const dias = birthday.dias_para_cumple;
            //statusText = `Faltan ${dias} día${dias > 1 ? 's' : ''}`;
        } else {
            statusText = birthday.puesto || 'Empleado';
        }

        return `
            <div class="birthday-item ${isToday ? 'today' : ''}">
                <div class="birthday-avatar">
                    ${initials}
                </div>
                <div class="birthday-info">
                    <h4>${birthday.nombre_completo}</h4>
                    <p>${statusText}</p>
                    ${ageText ? `<!--<span class="birthday-age">${ageText}</span>-->` : ''}
                </div>
                <div class="birthday-date">
                    <div class="birthday-day">${day}</div>
                    <div class="birthday-month">${month}</div>
                </div>
            </div>
        `;
    }

    updateBirthdayStats(cumpleanosHoy) {
        // Agregar tarjeta de estadística de cumpleaños si hay cumpleaños hoy
        if (cumpleanosHoy > 0) {
            this.addBirthdayStatCard(cumpleanosHoy);
        }
    }

    addBirthdayStatCard(count) {
        const statsGrid = document.querySelector('.stats-grid');
        if (!statsGrid) return;

        // Verificar si ya existe la tarjeta
        let birthdayCard = document.querySelector('.stat-card.birthday');
        
        if (!birthdayCard) {
            birthdayCard = document.createElement('div');
            birthdayCard.className = 'stat-card birthday card-hover';
            statsGrid.appendChild(birthdayCard);
        }

        birthdayCard.innerHTML = `
            <div class="stat-icon">
                <i class="fas fa-birthday-cake"></i>
            </div>
            <div class="stat-info">
                <h3>${count}</h3>
                <p>Cumpleaños${count > 1 ? ' Hoy' : ' Hoy'}</p>
            </div>
        `;
    }

    getInitials(fullName) {
        if (!fullName) return '??';
        return fullName
            .split(' ')
            .map(name => name.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    playBirthdaySound() {
        // Reproducir sonido de cumpleaños (opcional)
        try {
            // Crear un beep corto para celebrar
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const audioContext = new (AudioContext || webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            }
        } catch (error) {
            console.log('Birthday sound not available:', error);
        }
    }

    showConfetti() {
        // Mostrar confetti animado
        this.createConfetti();
    }

    createConfetti() {
        const colors = ['#ff6b6b', '#ee5a24', '#ffa502', '#ffffff', '#ff9ff3'];
        const confettiCount = 30;
        
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                this.createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
            }, i * 100);
        }
    }

    createConfettiPiece(color) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            top: -10px;
            left: ${Math.random() * 100}vw;
            width: ${5 + Math.random() * 10}px;
            height: ${5 + Math.random() * 10}px;
            background: ${color};
            border-radius: 50%;
            z-index: 10000;
            pointer-events: none;
            animation: confettiFall ${2 + Math.random() * 3}s linear forwards;
        `;
        
        document.body.appendChild(confetti);
        
        // Remover después de la animación
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 5000);
    }
}

// Inicializar el manager de cumpleaños
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Birthday Manager...');
    window.birthdayManager = new BirthdayManager();
});