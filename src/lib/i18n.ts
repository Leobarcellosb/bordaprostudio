type Lang = "pt" | "en" | "es";

const dict: Record<string, Record<Lang, string>> = {
  // Sidebar / Nav
  "nav.dashboard": { pt: "Dashboard", en: "Dashboard", es: "Panel" },
  "nav.library": { pt: "Biblioteca", en: "Library", es: "Biblioteca" },
  "nav.favorites": { pt: "Favoritos", en: "Favorites", es: "Favoritos" },
  "nav.downloads": { pt: "Meus Downloads", en: "My Downloads", es: "Mis Descargas" },
  "nav.trends": { pt: "Tendências", en: "Trends", es: "Tendencias" },
  "nav.productIdeas": { pt: "Ideias de Produto", en: "Product Ideas", es: "Ideas de Producto" },
  "nav.salesGenerator": { pt: "Gerador de Vendas", en: "Sales Generator", es: "Generador de Ventas" },
  
  "nav.profitCalculator": { pt: "Calculadora de Lucro", en: "Profit Calculator", es: "Calculadora de Ganancia" },
  "nav.catalogs": { pt: "Catálogos", en: "Catalogs", es: "Catálogos" },
  "nav.plans": { pt: "Planos", en: "Plans", es: "Planes" },
  "nav.adminPanel": { pt: "Painel Admin", en: "Admin Panel", es: "Panel Admin" },
  "nav.settings": { pt: "Configurações", en: "Settings", es: "Configuración" },
  "nav.logout": { pt: "Sair", en: "Log out", es: "Salir" },
  "nav.menu": { pt: "Menu", en: "Menu", es: "Menú" },
  "nav.admin": { pt: "Admin", en: "Admin", es: "Admin" },

  // Dashboard
  "dashboard.hello": { pt: "Olá", en: "Hello", es: "Hola" },
  "dashboard.subtitle": { pt: "Explore novas matrizes, descubra tendências e transforme seus bordados em produtos incríveis.", en: "Explore new designs, discover trends and turn your embroidery into amazing products.", es: "Explore nuevas matrices, descubra tendencias y transforme sus bordados en productos increíbles." },
  "dashboard.exploreLibrary": { pt: "Explorar Biblioteca", en: "Explore Library", es: "Explorar Biblioteca" },
  "dashboard.availableDesigns": { pt: "Matrizes disponíveis", en: "Available designs", es: "Matrices disponibles" },
  "dashboard.yourDownloads": { pt: "Seus downloads", en: "Your downloads", es: "Tus descargas" },
  "dashboard.activeSubscription": { pt: "Sua assinatura ativa", en: "Your active subscription", es: "Tu suscripción activa" },
  "dashboard.yourFavorites": { pt: "Seus Favoritos", en: "Your Favorites", es: "Tus Favoritos" },
  "dashboard.savedDesigns": { pt: "Matrizes que você salvou", en: "Designs you saved", es: "Matrices que guardaste" },
  "dashboard.suggestionsOfDay": { pt: "Sugestões do Dia", en: "Today's Picks", es: "Sugerencias del Día" },
  "dashboard.selectedForYou": { pt: "Selecionados especialmente para você", en: "Selected especially for you", es: "Seleccionados especialmente para ti" },
  "dashboard.newDesigns": { pt: "Novas Matrizes", en: "New Designs", es: "Nuevas Matrices" },
  "dashboard.recentlyAdded": { pt: "Recém adicionadas à biblioteca", en: "Recently added to the library", es: "Recién añadidas a la biblioteca" },
  "dashboard.viewAll": { pt: "Ver todas", en: "View all", es: "Ver todas" },
  "dashboard.noDesignsAvailable": { pt: "Nenhuma matriz disponível no momento.", en: "No designs available at the moment.", es: "Ninguna matriz disponible en este momento." },
  "dashboard.trending": { pt: "Em Alta", en: "Trending", es: "En Tendencia" },
  "dashboard.trendingSubtitle": { pt: "Mais baixados nos últimos 7 dias", en: "Most downloaded in the last 7 days", es: "Más descargados en los últimos 7 días" },
  "dashboard.mostDownloaded": { pt: "Mais Baixados", en: "Most Downloaded", es: "Más Descargados" },
  "dashboard.mostDownloadedSubtitle": { pt: "As matrizes mais populares da comunidade", en: "The most popular designs in the community", es: "Las matrices más populares de la comunidad" },
  "dashboard.rankingsWillAppear": { pt: "Os rankings aparecerão conforme as matrizes forem baixadas.", en: "Rankings will appear as designs are downloaded.", es: "Los rankings aparecerán conforme se descarguen las matrices." },
  "dashboard.noDesignsNow": { pt: "Nenhuma matriz disponível no momento", en: "No designs available right now", es: "Ninguna matriz disponible en este momento" },

  // Settings
  "settings.title": { pt: "Configurações", en: "Settings", es: "Configuración" },
  "settings.profile": { pt: "Perfil", en: "Profile", es: "Perfil" },
  "settings.updateInfo": { pt: "Atualize suas informações pessoais", en: "Update your personal information", es: "Actualice su información personal" },
  "settings.firstName": { pt: "Nome", en: "First name", es: "Nombre" },
  "settings.lastName": { pt: "Sobrenome", en: "Last name", es: "Apellido" },
  "settings.email": { pt: "Email", en: "Email", es: "Correo electrónico" },
  "settings.phone": { pt: "Telefone", en: "Phone", es: "Teléfono" },
  "settings.optional": { pt: "(opcional)", en: "(optional)", es: "(opcional)" },
  "settings.brandName": { pt: "Nome da sua marca de bordados", en: "Your embroidery brand name", es: "Nombre de tu marca de bordados" },
  "settings.saveChanges": { pt: "Salvar alterações", en: "Save changes", es: "Guardar cambios" },
  "settings.saving": { pt: "Salvando...", en: "Saving...", es: "Guardando..." },
  "settings.changePhoto": { pt: "Alterar foto", en: "Change photo", es: "Cambiar foto" },
  "settings.uploading": { pt: "Enviando...", en: "Uploading...", es: "Subiendo..." },
  "settings.languageTitle": { pt: "Idioma da Interface", en: "Interface Language", es: "Idioma de la Interfaz" },
  "settings.languageDesc": { pt: "Escolha o idioma da plataforma.", en: "Choose the platform language.", es: "Elija el idioma de la plataforma." },
  "settings.language": { pt: "Idioma", en: "Language", es: "Idioma" },
  "settings.profileUpdated": { pt: "Perfil atualizado!", en: "Profile updated!", es: "¡Perfil actualizado!" },
  "settings.photoUpdated": { pt: "Foto atualizada!", en: "Photo updated!", es: "¡Foto actualizada!" },
  "settings.languageSaved": { pt: "Idioma salvo!", en: "Language saved!", es: "¡Idioma guardado!" },
  "settings.uploadError": { pt: "Erro ao enviar imagem", en: "Error uploading image", es: "Error al subir imagen" },

  // Library
  "library.title": { pt: "Biblioteca de Matrizes", en: "Design Library", es: "Biblioteca de Matrices" },
  "library.subtitle": { pt: "Explore nossa biblioteca de matrizes de bordado profissionais, prontas para usar.", en: "Explore our library of professional embroidery designs, ready to use.", es: "Explore nuestra biblioteca de matrices de bordado profesionales, listas para usar." },
  "library.searchPlaceholder": { pt: "Buscar por título, descrição ou tags...", en: "Search by title, description or tags...", es: "Buscar por título, descripción o etiquetas..." },
  "library.allCategories": { pt: "Todas as categorias", en: "All categories", es: "Todas las categorías" },
  "library.allFormats": { pt: "Todos os formatos", en: "All formats", es: "Todos los formatos" },
  "library.designsFound": { pt: "matrizes encontradas", en: "designs found", es: "matrices encontradas" },
  "library.designFound": { pt: "matriz encontrada", en: "design found", es: "matriz encontrada" },
  "library.clearFilters": { pt: "Limpar filtros", en: "Clear filters", es: "Limpiar filtros" },
  "library.clearAllFilters": { pt: "Limpar todos os filtros", en: "Clear all filters", es: "Limpiar todos los filtros" },
  "library.noResults": { pt: "Nenhuma matriz encontrada", en: "No designs found", es: "Ninguna matriz encontrada" },
  "library.noResultsHint": { pt: "Tente usar outras palavras-chave ou ajustar os filtros para encontrar o que procura.", en: "Try using other keywords or adjusting filters to find what you're looking for.", es: "Intente usar otras palabras clave o ajustar los filtros para encontrar lo que busca." },
  "library.designs": { pt: "matrizes", en: "designs", es: "matrices" },
  "library.allHoops": { pt: "Todos os bastidores", en: "All hoops", es: "Todos los bastidores" },

  // Favorites
  "favorites.title": { pt: "Meus Favoritos", en: "My Favorites", es: "Mis Favoritos" },
  "favorites.count": { pt: "matrizes salvas", en: "saved designs", es: "matrices guardadas" },
  "favorites.countSingular": { pt: "matriz salva", en: "saved design", es: "matriz guardada" },
  "favorites.emptyTitle": { pt: "Suas matrizes favoritas aparecerão aqui", en: "Your favorite designs will appear here", es: "Tus matrices favoritas aparecerán aquí" },
  "favorites.noFavorites": { pt: "Nenhum favorito ainda", en: "No favorites yet", es: "Ningún favorito aún" },
  "favorites.noFavoritesHint": { pt: "Clique no ❤️ nas matrizes da biblioteca para salvá-las aqui.", en: "Click ❤️ on library designs to save them here.", es: "Haz clic en ❤️ en las matrices de la biblioteca para guardarlas aquí." },

  // Downloads
  "downloads.title": { pt: "Meus Downloads", en: "My Downloads", es: "Mis Descargas" },
  "downloads.subtitle": { pt: "Histórico de matrizes baixadas", en: "Download history", es: "Historial de descargas" },
  "downloads.empty": { pt: "Você ainda não baixou nenhuma matriz.", en: "You haven't downloaded any designs yet.", es: "Aún no has descargado ninguna matriz." },
  "downloads.emptyHint": { pt: "Explore a biblioteca para começar!", en: "Explore the library to get started!", es: "¡Explora la biblioteca para comenzar!" },

  // Pricing
  "pricing.badge": { pt: "Planos Borda Pro", en: "Borda Pro Plans", es: "Planes Borda Pro" },
  "pricing.title": { pt: "Invista no seu negócio", en: "Invest in your business", es: "Invierte en tu negocio" },
  "pricing.titleHighlight": { pt: "de bordados", en: "of embroidery", es: "de bordados" },
  "pricing.subtitle": { pt: "Acesse toda a biblioteca de bordados, ferramentas exclusivas e atualizações constantes.", en: "Access the full embroidery library, exclusive tools and constant updates.", es: "Acceda a toda la biblioteca de bordados, herramientas exclusivas y actualizaciones constantes." },
  "pricing.currentPlan": { pt: "Plano atual", en: "Current plan", es: "Plan actual" },
  "pricing.secureCheckout": { pt: "Checkout seguro", en: "Secure checkout", es: "Pago seguro" },
  "pricing.guarantee": { pt: "Garantia de 7 dias", en: "7-day guarantee", es: "Garantía de 7 días" },
  "pricing.cancelAnytime": { pt: "Cancelamento a qualquer momento", en: "Cancel anytime", es: "Cancela en cualquier momento" },

  // Admin
  "admin.title": { pt: "Painel Administrativo", en: "Admin Panel", es: "Panel Administrativo" },
  "admin.subtitle": { pt: "Gerencie designs, categorias e usuários", en: "Manage designs, categories and users", es: "Gestione diseños, categorías y usuarios" },
  "admin.overview": { pt: "Visão Geral", en: "Overview", es: "Vista General" },
  "admin.designs": { pt: "Matrizes", en: "Designs", es: "Matrices" },
  "admin.import": { pt: "Importar", en: "Import", es: "Importar" },
  "admin.categories": { pt: "Categorias", en: "Categories", es: "Categorías" },
  "admin.users": { pt: "Usuários", en: "Users", es: "Usuarios" },
  "admin.downloads": { pt: "Downloads", en: "Downloads", es: "Descargas" },
  "admin.subscriptions": { pt: "Assinaturas", en: "Subscriptions", es: "Suscripciones" },

  // Common
  "common.user": { pt: "Usuário", en: "User", es: "Usuario" },
  "common.cancel": { pt: "Cancelar", en: "Cancel", es: "Cancelar" },
  "common.save": { pt: "Salvar", en: "Save", es: "Guardar" },
  "common.search": { pt: "Buscar", en: "Search", es: "Buscar" },
  "common.loading": { pt: "Carregando...", en: "Loading...", es: "Cargando..." },
  "common.madeWith": { pt: "Feito com ❤️ por G Bordados", en: "Made with ❤️ by G Bordados", es: "Hecho con ❤️ por G Bordados" },

  // Mobile nav shorter labels
  "nav.mobile.downloads": { pt: "Downloads", en: "Downloads", es: "Descargas" },
  "nav.mobile.ideas": { pt: "Ideias", en: "Ideas", es: "Ideas" },
  "nav.mobile.sales": { pt: "Vendas", en: "Sales", es: "Ventas" },
  
  "nav.mobile.calculator": { pt: "Calculadora", en: "Calculator", es: "Calculadora" },
};

export type TranslationKey = keyof typeof dict;

export function getLanguage(): Lang {
  const stored = localStorage.getItem("app_language");
  if (stored === "en" || stored === "es" || stored === "pt") return stored;
  return "pt";
}

export function t(key: string): string {
  const lang = getLanguage();
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] || entry.pt || key;
}
