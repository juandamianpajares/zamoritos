# Roadmap — Zamoritos

## Sprint post-turismo (pendiente)

### 1. Ajustes de caja sin producto físico (costo de envío / descuentos)

**Contexto**
El cliente necesita poder sumar o restar montos de la caja con un motivo (ej: "Costo de envío +$100", "Bolsa Rota -$150"). Para los descuentos/ajustes negativos ya existe el mecanismo de **productos tipo REGALO** (`en_promo = 3`): se crean productos ficticios con precio negativo (ej: "Bolsa Rota" a -$150) y se agregan a la venta normalmente — quedan registrados en el historial, afectan el total y aparecen en el dashboard y resumen de caja.

**Para las sumas (costo de envío)**:
Requiere la página de **Pedidos/Envíos** (ver ítem 2). Hasta entonces, como workaround se puede crear un producto ficticio "Envío" con precio positivo y sin stock.

**Pendiente de implementar**:
- [ ] Página de Pedidos/Envíos (ver abajo)
- [ ] Asociar costo de envío al pedido y al cliente
- [ ] Mostrar desglose de envíos en resumen de caja

---

### 2. Página de Pedidos / Envíos

**Contexto**
Actualmente no existe gestión de pedidos ni clientes. Para soportar el costo de envío de forma correcta se necesita:

- [ ] Modelo `Cliente` (nombre, teléfono, dirección)
- [ ] Modelo `Pedido` (cliente, productos, estado: pendiente/enviado/entregado/cancelado)
- [ ] Asociar `Envio` a un pedido con costo y medio de transporte
- [ ] Página `/pedidos` con listado, estado y acciones
- [ ] Integración con ventas: generar venta desde un pedido

---

### 3. Página de Contabilidad (`/contabilidad`)

**Contexto**
Para el manejo y conciliación de cuentas, se necesita una sección dedicada que permita:

#### 3.1 Medios de pago y saldos
- [ ] Registro de saldos por medio de pago (efectivo en caja, saldo bancario, billetera virtual)
- [ ] Conciliación: contrastar ventas por medio vs saldo real declarado

#### 3.2 Tipo de cambio USD
- [ ] Configuración del tipo de cambio dólar/peso vigente (actualizable manualmente)
- [ ] Visualización de totales en USD en reportes

#### 3.3 Tarjetas de crédito
- [ ] Diferenciar cobros con tarjeta de débito vs crédito
- [ ] Registro de cierres de tarjeta (fecha de acreditación, comisión del POS)
- [ ] Conciliación de acreditaciones: monto vendido vs monto recibido (descontando comisiones)
- [ ] Arqueo de tarjeta: ventas del período vs cierre recibido

#### 3.4 Servicios de POS (cargo por procesamiento)
- [ ] Configurar porcentaje de comisión por terminal/red (Visa, Master, OCA, etc.)
- [ ] Cálculo automático del neto a recibir por ventas con tarjeta
- [ ] Mostrar en resumen de caja: bruto vendido vs neto esperado

#### 3.5 Cierre de ejercicio
- [ ] Definir períodos contables (mensual/anual)
- [ ] Generar balance de caja del período (ingresos - egresos por medio de pago)
- [ ] Exportar a PDF/CSV para contador
- [ ] Bloqueo de edición de ventas en períodos cerrados

---

## Mejoras menores pendientes

- [ ] Costo de envío como ítem de ajuste en ventas (workaround hasta Pedidos)
- [ ] Filtro de ventas por cliente en historial
- [ ] Reporte de márgenes por categoría

---

*Última actualización: sprint marzo 2026*
