export const institutionalPages = [
  { slug: "", title: "Información general", description: "Conoce el municipio, sus funciones y cómo se organiza." },
  { slug: "autoridades", title: "Alcaldía y regidores", description: "Conoce a las autoridades y las comisiones del Concejo Municipal." },
  { slug: "organigrama", title: "Organigrama", description: "Consulta la estructura de gobierno, administración y atención al vecino." },
  { slug: "equipo", title: "Directorio de personal", description: "Encuentra a quienes trabajan en cada área del municipio ficticio." },
  { slug: "imagen-institucional", title: "Imagen institucional", description: "Consulta la identidad visual y los recursos gráficos de Villa del Sol." },
];

export const mayor = {
  name: "Elena Valdivia Rojas",
  role: "Alcaldesa",
  description: "Representa al municipio y coordina con el Concejo y la Gerencia Municipal el seguimiento de los servicios y proyectos del distrito.",
};

export const council = [
  { name: "Lucía Huamán Torres", role: "Regidora", description: "Comisión de cultura, educación y deporte." },
  { name: "Mateo Rivas Quispe", role: "Regidor", description: "Comisión de desarrollo urbano y movilidad." },
  { name: "Camila Montes Paredes", role: "Regidora", description: "Comisión de ambiente y espacios públicos." },
  { name: "Diego Salazar Núñez", role: "Regidor", description: "Comisión de presupuesto y administración." },
  { name: "Valeria Castro León", role: "Regidora", description: "Comisión de participación vecinal y desarrollo social." },
];

export const management = [
  { name: "Gabriel Cárdenas Soto", role: "Gerente municipal", area: "Gerencia Municipal" },
  { name: "María Paz Vargas", role: "Asistente de gerencia", area: "Gerencia Municipal" },
  { name: "Renato Palomino Flores", role: "Responsable de comunicación", area: "Imagen Institucional" },
  { name: "Jimena Aguilar Medina", role: "Asistente de comunicación", area: "Imagen Institucional" },
];

export const departmentStaff: Record<string, [string, string, string, string]> = {
  "atencion-al-vecino": ["Sofía Rivera Flores", "Jefa de atención", "Andrés Herrera Ruiz", "Orientador"],
  "desarrollo-urbano": ["Gabriela Torres Peña", "Jefa de desarrollo urbano", "Daniel Morales Vega", "Especialista urbano"],
  cultura: ["Inés Navarro Ríos", "Coordinadora de cultura", "Javier Luna Ramos", "Promotor cultural"],
  "administracion-tributaria": ["Paola Flores Dávila", "Jefa de administración tributaria", "Marco Linares Gil", "Analista tributario"],
  catastro: ["Isabel Ponce Rojas", "Coordinadora de catastro", "Sebastián Reyna Castro", "Técnico catastral"],
  "desarrollo-economico": ["Ángela Núñez León", "Jefa de desarrollo económico", "Nicolás Soto Vega", "Especialista en licencias"],
  "gestion-ambiental": ["Rocío Salas Prado", "Jefa de gestión ambiental", "Omar Ríos Luna", "Coordinador de reciclaje"],
  "participacion-vecinal": ["Laura Cruz Herrera", "Coordinadora de participación", "Felipe Arias Torres", "Promotor vecinal"],
  "deportes-y-recreacion": ["Teresa Rojas Vidal", "Coordinadora de deportes", "Luis Paz Medina", "Encargado de espacios deportivos"],
  "movilidad-urbana": ["Claudia Ruiz Salas", "Jefa de movilidad", "Eduardo Tapia Rivas", "Técnico de señalización"],
  "gestion-del-riesgo": ["Daniela Ramos Peña", "Coordinadora de prevención", "Carlos Peralta Nuño", "Especialista en inspección"],
  "secretaria-general": ["Andrea León Vega", "Secretaria general", "Martín Huerta Gil", "Asistente de archivo"],
};

export const organization = [
  { title: "Gobierno municipal", description: "Deliberación y dirección del municipio.", links: [
    { label: "Concejo Municipal", href: "/institucional/autoridades#concejo" },
    { label: "Alcaldía", href: "/institucional/autoridades#alcaldia" },
  ] },
  { title: "Gestión y apoyo", description: "Coordinación administrativa, documentación y comunicación.", links: [
    { label: "Secretaría General", href: "/directorio/secretaria-general" },
    { label: "Imagen Institucional", href: "/institucional/imagen-institucional" },
    { label: "Administración Tributaria", href: "/directorio/administracion-tributaria" },
  ] },
  { title: "Servicios al vecino", description: "Áreas que atienden consultas y prestan servicios en el distrito.", links: [
    { label: "Atención al Vecino", href: "/directorio/atencion-al-vecino" },
    { label: "Desarrollo Urbano", href: "/directorio/desarrollo-urbano" },
    { label: "Catastro", href: "/directorio/catastro" },
    { label: "Desarrollo Económico", href: "/directorio/desarrollo-economico" },
    { label: "Gestión Ambiental", href: "/directorio/gestion-ambiental" },
    { label: "Cultura y Educación", href: "/directorio/cultura" },
    { label: "Participación Vecinal", href: "/directorio/participacion-vecinal" },
    { label: "Deportes y Recreación", href: "/directorio/deportes-y-recreacion" },
    { label: "Movilidad Urbana", href: "/directorio/movilidad-urbana" },
    { label: "Gestión del Riesgo", href: "/directorio/gestion-del-riesgo" },
  ] },
];
