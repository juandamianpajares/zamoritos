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

#### 3.1 Resumen de medios de pago y saldos
- [ ] Registro de saldos por medio de pago (efectivo en caja, saldo bancario, billetera virtual)
- [ ] Conciliación: contrastar ventas por medio vs saldo real declarado

#### 3.2 Débito → clasificación directa al banco
- [ ] Distinguir red de débito por banco emisor (BROU, Santander, Itaú, BBVA, etc.)
- [ ] Cada transacción de débito se clasifica al banco correspondiente (acreditación D+1)
- [ ] Vista de movimientos de débito agrupados por banco y fecha
- [ ] Conciliación: monto vendido por débito vs acreditación esperada por banco

#### 3.3 Crédito → mayor diario y cierre de lote
- [ ] Mayor diario de tarjeta de crédito: registro de todas las ventas pendientes de lote
- [ ] Cierre de lote por terminal (manual o automático al fin del día)
- [ ] Generar informe de lote cerrado (terminal, fecha, monto bruto, comisión, neto esperado)
- [ ] Historial de lotes cerrados con estado: pendiente acreditación / acreditado / con diferencia
- [ ] Fecha estimada de acreditación por red/banco

#### 3.4 Comparación de cierre de tarjetas al vencimiento entre bancos
- [ ] Tabla comparativa: banco | red | monto vendido | comisión | neto esperado | neto recibido | diferencia
- [ ] Alerta automática si hay diferencia entre lo esperado y lo acreditado
- [ ] Filtro por período (semana / mes) y por banco
- [ ] Exportar comparativo para el contador

#### 3.5 Contabilidad básica
- [ ] Balance del período: ingresos (ventas) − egresos (compras + ajustes) = resultado neto
- [ ] Desglose por medio de cobro (efectivo, débito, crédito, transferencia)
- [ ] Tipo de cambio USD configurable manualmente
- [ ] Visualización de totales en USD en reportes
- [ ] Cierre de ejercicio mensual/anual con exportación PDF/CSV

#### 3.6 Servicios de POS (comisiones)
- [ ] Configurar porcentaje de comisión por terminal/red (Visa, Master, OCA, ANDA, CABAL)
- [ ] Cálculo automático del neto a recibir por ventas con tarjeta
- [ ] Mostrar en resumen de caja: bruto vendido vs neto esperado

#### 3.7 Cierre de ejercicio
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
