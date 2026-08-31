Contexto del proyecto
Vamos a construir una tienda de ropa online con Node.js, minimalista e interactiva, enfocada en un flujo simple: el cliente navega el catálogo, arma su pedido, completa un checkout corto y al confirmar es redirigido a WhatsApp con el pedido ya armado en el mensaje. No hay pasarela de pago ni backend de pedidos persistente: WhatsApp es el canal final de conversión.
Solo necesito 4 pantallas/vistas, nada más:
Home
Catálogo
Checkout
Confirmación → Redirección a WhatsApp

1. Home
Hero minimalista, con imagen o video de fondo, tipografía grande y limpia, y un CTA principal ("Ver catálogo").
Puede incluir 1-2 secciones cortas debajo del hero: destacados/nuevos productos, o categorías principales (ej. "Hombre", "Mujer", "Accesorios") como tarjetas grandes con hover.
Nada de secciones largas tipo landing corporativa: el objetivo es que el usuario llegue rápido al catálogo.
2. Catálogo
Grid de productos (imagen, nombre, precio) con hover sutil (zoom leve o cambio de imagen).
Filtros simples: categoría, talla, y opcionalmente color/precio.
Cada producto abre un detalle (puede ser modal o página) con selección de talla/color/cantidad y botón "Agregar al carrito".
Carrito flotante/lateral (drawer) que se abre sin recargar la página, mostrando ítems, cantidad editable y subtotal.
3. Checkout
Formulario corto: nombre completo, teléfono, dirección de entrega (o retiro en tienda si aplica), y notas opcionales.
Resumen del pedido (productos, cantidades, talla/color, subtotal, envío si aplica, total).
Validación básica de campos antes de habilitar "Confirmar pedido".
4. Confirmación y redirección a WhatsApp
Al confirmar, se genera un mensaje de texto con el detalle del pedido (productos, cantidades, tallas, total, datos del cliente) y se abre WhatsApp (https://wa.me/NUMERO?text=MENSAJE_ENCODEADO) en una nueva pestaña/redirección.
Antes de redirigir, mostrar una pantalla breve de confirmación ("Tu pedido fue generado, te estamos redirigiendo a WhatsApp...") para que no se sienta abrupto.
El número de WhatsApp debe ser configurable (variable de entorno o archivo de config), no hardcodeado en el componente.

Estilo visual (referencia adjunta)
Minimalista, orden y aire (whitespace generoso), tipografía sans-serif limpia, un solo color de acento fuerte (verde azulado/teal en el ejemplo) sobre fondo blanco/negro. Tarjetas con bordes suaves, imágenes grandes y de buena calidad, poco texto por sección, iconografía simple. Evitar recargar de elementos: cada sección tiene un solo foco visual claro.
Paleta: base neutra (blanco/negro/gris) + 1 color de acento para botones y elementos interactivos.
Tipografía: un heading grande y limpio + texto de apoyo pequeño y liviano.
Botones con estados hover/active visibles pero sutiles (no shadows exagerados).
Mobile-first: la mayoría de clientes van a comprar desde el celular, así que el diseño y el flujo del carrito/checkout deben priorizarse para pantallas chicas.

Estructura de datos sugerida (ajustar si el proyecto ya tiene algo distinto)
js
// Producto
{
  id, nombre, precio, categoria, tallas: [], colores: [], imagenes: [], descripcion, stock
}

// Item del carrito
{
  productoId, nombre, talla, color, cantidad, precioUnitario
}

// Pedido (antes de mandar a WhatsApp)
{
  cliente: { nombre, telefono, direccion, notas },
  items: [ /* items del carrito */ ],
  total
}
Formato sugerido del mensaje de WhatsApp
Hola! Quiero hacer este pedido:

- 2x Remera Oversize (Talla M, Negro) - $XX.XXX
- 1x Jean Recto (Talla 32) - $XX.XXX

Total: $XX.XXX

Nombre: [nombre]
Teléfono: [telefono]
Dirección: [direccion]
Notas: [notas]

Consideraciones técnicas
No implementar pasarela de pago real: el pedido se "cierra" en WhatsApp, no hay transacción online.
El carrito puede vivir en estado local (localStorage o estado de sesión) ya que no hay cuentas de usuario.
Mantener el catálogo desacoplado de la fuente de datos (aunque hoy sean datos mock/JSON, que sea fácil migrarlo a una base de datos después).
Priorizar performance de imágenes (lazy loading) ya que el catálogo es visual.


