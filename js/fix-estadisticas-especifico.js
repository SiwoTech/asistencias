// Fix específico para las estadísticas de empleados basado en la imagen
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que empleadosModule esté disponible
    setTimeout(() => {
        if (window.empleadosModule) {
            // Sobrescribir el método updateStatsDisplay con la versión específica
            window.empleadosModule.updateStatsDisplaySpecific = function(stats) {
                console.log('🎯 ===== ACTUALIZANDO ESTADÍSTICAS ESPECÍFICAS =====');
                console.log('Stats recibidas:', stats);
                
                let updated = 0;
                
                // Buscar los números "0" en las tarjetas de estadísticas
                const allElements = document.querySelectorAll('*');
                const statsCards = [];
                
                // Identificar las tarjetas de estadísticas
                allElements.forEach(element => {
                    if (element.children.length === 0 && element.textContent.trim() === '0') {
                        const parent = element.parentElement;
                        if (parent) {
                            const parentText = parent.textContent.toLowerCase();
                            
                            // Identificar cada tipo de estadística por el texto del contenedor padre
                            if (parentText.includes('total') && parentText.includes('empleado')) {
                                console.log('🎯 Total Empleados encontrado:', element);
                                element.textContent = stats.total;
                                element.style.color = '#e74c3c';
                                this.animateUpdate(element);
                                updated++;
                                
                            } else if (parentText.includes('empleados') && parentText.includes('activo')) {
                                console.log('🎯 Empleados Activos encontrado:', element);
                                element.textContent = stats.activos;
                                element.style.color = '#27ae60';
                                this.animateUpdate(element);
                                updated++;
                                
                            } else if (parentText.includes('nuevos') && (parentText.includes('este') || parentText.includes('mes'))) {
                                console.log('🎯 Nuevos Este Mes encontrado:', element);
                                element.textContent = stats.nuevos;
                                element.style.color = '#e74c3c';
                                this.animateUpdate(element);
                                updated++;
                                
                            } else if (parentText.includes('departamento')) {
                                console.log('🎯 Departamentos encontrado:', element);
                                element.textContent = stats.departamentos;
                                element.style.color = '#f39c12';
                                this.animateUpdate(element);
                                updated++;
                            }
                        }
                    }
                });
                
                // Método alternativo: buscar por estructura específica
                if (updated === 0) {
                    console.log('🔍 Método alternativo: buscando por estructura...');
                    
                    // Buscar elementos que tengan íconos y texto específico
                    const iconContainers = document.querySelectorAll('.fa-users, .fa-user-check, .fa-user-plus, .fa-building');
                    
                    iconContainers.forEach(icon => {
                        const container = icon.closest('div, section, article');
                        if (container) {
                            const numberElement = container.querySelector('*');
                            const textElements = container.querySelectorAll('*');
                            
                            textElements.forEach(textEl => {
                                const text = textEl.textContent.toLowerCase();
                                const numberElements = container.querySelectorAll('*');
                                
                                numberElements.forEach(numEl => {
                                    if (numEl.textContent.trim() === '0') {
                                        if (text.includes('total') && text.includes('empleado')) {
                                            numEl.textContent = stats.total;
                                            updated++;
                                        } else if (text.includes('activo')) {
                                            numEl.textContent = stats.activos;
                                            updated++;
                                        } else if (text.includes('nuevo')) {
                                            numEl.textContent = stats.nuevos;
                                            updated++;
                                        } else if (text.includes('departamento')) {
                                            numEl.textContent = stats.departamentos;
                                            updated++;
                                        }
                                    }
                                });
                            });
                        }
                    });
                }
                
                // Método de fuerza bruta: actualizar todos los "0" en orden
                if (updated === 0) {
                    console.log('🔨 Método de fuerza bruta: actualizando todos los 0s...');
                    
                    const zeros = [];
                    allElements.forEach(el => {
                        if (el.children.length === 0 && el.textContent.trim() === '0') {
                            // Verificar que esté en una tarjeta de estadísticas (no en inputs, etc.)
                            const isInCard = el.closest('.card, .stat, .widget, .summary, [class*="stat"], [class*="card"]');
                            if (isInCard && el.tagName !== 'INPUT') {
                                zeros.push(el);
                            }
                        }
                    });
                    
                    console.log(`📊 Encontrados ${zeros.length} elementos con "0"`);
                    
                    // Asignar valores en orden: Total, Activos, Nuevos, Departamentos
                    const values = [stats.total, stats.activos, stats.nuevos, stats.departamentos];
                    
                    zeros.forEach((element, index) => {
                        if (index < values.length) {
                            console.log(`📊 Actualizando elemento ${index + 1}: ${values[index]}`);
                            element.textContent = values[index];
                            this.animateUpdate(element);
                            updated++;
                        }
                    });
                }
                
                console.log(`✅ Estadísticas actualizadas: ${updated} elementos`);
                return updated;
            };
            
            // Método para animar la actualización
            window.empleadosModule.animateUpdate = function(element) {
                if (element) {
                    element.style.transition = 'all 0.5s ease';
                    element.style.transform = 'scale(1.2)';
                    element.style.fontWeight = 'bold';
                    
                    setTimeout(() => {
                        element.style.transform = 'scale(1)';
                    }, 500);
                }
            };
            
            // Sobrescribir el método original para usar la versión específica
            const originalUpdateStats = window.empleadosModule.updateStatsDisplay;
            window.empleadosModule.updateStatsDisplay = function(stats) {
                console.log('📊 Usando método específico para actualizar estadísticas');
                const updated = this.updateStatsDisplaySpecific(stats);
                
                // Si no se actualizó nada, usar el método original como respaldo
                if (updated === 0) {
                    console.log('⚠️ Método específico falló, usando método original...');
                    originalUpdateStats.call(this, stats);
                }
            };
            
            console.log('✅ Fix específico para estadísticas cargado');
        } else {
            console.log('⚠️ empleadosModule no disponible aún');
        }
    }, 3000);
});

// También crear una función manual para probar
window.testUpdateStats = function() {
    if (window.empleadosModule && window.empleadosModule.empleados) {
        console.log('🧪 Probando actualización manual de estadísticas...');
        const stats = {
            total: window.empleadosModule.empleados.length,
            activos: window.empleadosModule.empleados.filter(emp => emp.activo).length,
            nuevos: 1, // Test
            departamentos: 3 // Test
        };
        
        window.empleadosModule.updateStatsDisplay(stats);
    } else {
        console.log('❌ No se puede probar - empleadosModule o empleados no disponibles');
    }
};

console.log('🎯 Fix específico de estadísticas cargado - usa testUpdateStats() para probar manualmente');