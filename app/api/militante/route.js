"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PATCH = PATCH;
var server_1 = require("next/server");
var server_2 = require("@/lib/supabase/server");
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var adminClient, searchParams, page, pageSize, busqueda_1, estado, tipo, coordinadorId, _a, tiposData_1, tiposError, _b, coordinadoresData, coordError, coordinadorUsuarioIds_1, militantesQuery, _c, militantesData, militantesError, militantesExistentes, militanteUsuarioIds_1, usuariosQuery, _d, usuariosData, usuariosError, usuariosMilitantes, virtualMilitantes, allMilitantes, filteredMilitantes, totalCount, pagFrom, pagTo, paginatedMilitantes, nonVirtualMilitantes, usuarioIds, perfilIds, coordinadorIds, usuariosPromise, perfilesPromise, coordinadoresPromise, _e, usuariosRes, perfilesRes, coordinadoresRes, usuariosList, perfilesList, coordinadoresList, usuariosMap_1, perfilesMap_1, coordinadorToUsuarioMap_1, coordUsuarioIds, coordUsuariosList, _f, cuData, cuError, coordUsuarioMap_1, augmentedData, error_1;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 8, , 9]);
                    adminClient = (0, server_2.createAdminClient)();
                    searchParams = new URL(request.url).searchParams;
                    page = Math.max(1, parseInt(searchParams.get('page') || '1'));
                    pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '10'));
                    busqueda_1 = (searchParams.get('busqueda') || '').trim();
                    estado = (searchParams.get('estado') || '').trim();
                    tipo = (searchParams.get('tipo') || '').trim();
                    coordinadorId = (searchParams.get('coordinador_id') || '').trim();
                    return [4 /*yield*/, adminClient
                            .from('tipos_militante')
                            .select('id, codigo, descripcion')];
                case 1:
                    _a = _g.sent(), tiposData_1 = _a.data, tiposError = _a.error;
                    if (tiposError)
                        throw tiposError;
                    return [4 /*yield*/, adminClient
                            .from('coordinadores')
                            .select('usuario_id')
                            .not('usuario_id', 'is', null)];
                case 2:
                    _b = _g.sent(), coordinadoresData = _b.data, coordError = _b.error;
                    if (coordError) {
                        console.error('Error obteniendo coordinadores:', coordError);
                        return [2 /*return*/, server_1.NextResponse.json({ error: coordError.message }, { status: 500 })];
                    }
                    coordinadorUsuarioIds_1 = new Set((coordinadoresData || []).map(function (c) { return c.usuario_id; }).filter(Boolean));
                    militantesQuery = adminClient.from('militantes').select('*');
                    if (estado)
                        militantesQuery = militantesQuery.eq('estado', estado);
                    if (tipo)
                        militantesQuery = militantesQuery.eq('tipo', tipo);
                    if (coordinadorId)
                        militantesQuery = militantesQuery.eq('coordinador_id', coordinadorId);
                    return [4 /*yield*/, militantesQuery.order('creado_en', { ascending: false })];
                case 3:
                    _c = _g.sent(), militantesData = _c.data, militantesError = _c.error;
                    if (militantesError) {
                        console.error('Error listando militantes desde tabla:', militantesError);
                        return [2 /*return*/, server_1.NextResponse.json({ error: militantesError.message }, { status: 500 })];
                    }
                    militantesExistentes = (militantesData || []).filter(function (m) { return !coordinadorUsuarioIds_1.has(m.usuario_id); }).map(function (m) { return (__assign(__assign({}, m), { is_virtual: false })); });
                    militanteUsuarioIds_1 = new Set(militantesExistentes.map(function (m) { return m.usuario_id; }).filter(Boolean));
                    usuariosQuery = adminClient
                        .from('usuarios')
                        .select('id, nombres, apellidos, numero_documento, tipo_documento, celular, email, compromiso_marketing, compromiso_cautivo, compromiso_impacto, estado, creado_en, actualizado_en')
                        .not('estado', 'in', ['inactivo']);
                    if (busqueda_1) {
                        usuariosQuery = usuariosQuery.or("nombres.ilike.%".concat(busqueda_1, "%,apellidos.ilike.%").concat(busqueda_1, "%,numero_documento.ilike.%").concat(busqueda_1, "%"));
                    }
                    return [4 /*yield*/, usuariosQuery];
                case 4:
                    _d = _g.sent(), usuariosData = _d.data, usuariosError = _d.error;
                    if (usuariosError) {
                        console.error('Error obteniendo usuarios:', usuariosError);
                        return [2 /*return*/, server_1.NextResponse.json({ error: usuariosError.message }, { status: 500 })];
                    }
                    usuariosMilitantes = (usuariosData || []).filter(function (u) {
                        return !coordinadorUsuarioIds_1.has(u.id) && !militanteUsuarioIds_1.has(u.id);
                    });
                    virtualMilitantes = usuariosMilitantes.map(function (u) { return ({
                        id: "virtual-".concat(u.id),
                        usuario_id: u.id,
                        tipo: null,
                        coordinador_id: null,
                        compromiso_marketing: u.compromiso_marketing,
                        compromiso_cautivo: u.compromiso_cautivo,
                        compromiso_impacto: u.compromiso_impacto,
                        formulario: null,
                        perfil_id: null,
                        estado: u.estado || 'activo',
                        creado_en: u.creado_en,
                        actualizado_en: u.actualizado_en,
                        is_virtual: true,
                        nombres: u.nombres,
                        apellidos: u.apellidos,
                        numero_documento: u.numero_documento,
                        tipo_documento: u.tipo_documento,
                        celular: u.celular,
                        usuario_email: u.email,
                    }); });
                    allMilitantes = __spreadArray(__spreadArray([], militantesExistentes, true), virtualMilitantes, true);
                    allMilitantes.sort(function (a, b) { return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime(); });
                    filteredMilitantes = busqueda_1
                        ? allMilitantes.filter(function (m) {
                            var q = busqueda_1.toLowerCase();
                            var nombres = (m.nombres || '').toLowerCase();
                            var apellidos = (m.apellidos || '').toLowerCase();
                            var numeroDocumento = (m.numero_documento || '').toLowerCase();
                            return nombres.includes(q) || apellidos.includes(q) || numeroDocumento.includes(q);
                        })
                        : allMilitantes;
                    totalCount = filteredMilitantes.length;
                    pagFrom = (page - 1) * pageSize;
                    pagTo = pagFrom + pageSize;
                    paginatedMilitantes = filteredMilitantes.slice(pagFrom, pagTo);
                    nonVirtualMilitantes = paginatedMilitantes.filter(function (m) { return !m.is_virtual; });
                    usuarioIds = Array.from(new Set(nonVirtualMilitantes.map(function (m) { return m.usuario_id; }).filter(Boolean)));
                    perfilIds = Array.from(new Set(paginatedMilitantes.map(function (m) { return m.perfil_id; }).filter(Boolean)));
                    coordinadorIds = Array.from(new Set(paginatedMilitantes.map(function (m) { return m.coordinador_id; }).filter(Boolean)));
                    usuariosPromise = usuarioIds.length
                        ? adminClient.from('usuarios').select('id, nombres, apellidos, numero_documento, tipo_documento, celular, email').in('id', usuarioIds)
                        : Promise.resolve({ data: [] });
                    perfilesPromise = perfilIds.length
                        ? adminClient.from('perfiles').select('id, nombre').in('id', perfilIds)
                        : Promise.resolve({ data: [] });
                    coordinadoresPromise = coordinadorIds.length
                        ? adminClient.from('coordinadores').select('id, usuario_id').in('id', coordinadorIds)
                        : Promise.resolve({ data: [] });
                    return [4 /*yield*/, Promise.all([usuariosPromise, perfilesPromise, coordinadoresPromise])];
                case 5:
                    _e = _g.sent(), usuariosRes = _e[0], perfilesRes = _e[1], coordinadoresRes = _e[2];
                    usuariosList = (usuariosRes === null || usuariosRes === void 0 ? void 0 : usuariosRes.data) || [];
                    perfilesList = (perfilesRes === null || perfilesRes === void 0 ? void 0 : perfilesRes.data) || [];
                    coordinadoresList = (coordinadoresRes === null || coordinadoresRes === void 0 ? void 0 : coordinadoresRes.data) || [];
                    usuariosMap_1 = new Map((usuariosList || []).map(function (u) { return [u.id, u]; }));
                    perfilesMap_1 = new Map((perfilesList || []).map(function (p) { return [p.id, p.nombre]; }));
                    coordinadorToUsuarioMap_1 = new Map((coordinadoresList || []).map(function (c) { return [c.id, c.usuario_id]; }));
                    coordUsuarioIds = Array.from(new Set((coordinadoresList || []).map(function (c) { return c.usuario_id; }).filter(Boolean)));
                    coordUsuariosList = [];
                    if (!coordUsuarioIds.length) return [3 /*break*/, 7];
                    return [4 /*yield*/, adminClient
                            .from('usuarios')
                            .select('id, nombres, apellidos')
                            .in('id', coordUsuarioIds)];
                case 6:
                    _f = _g.sent(), cuData = _f.data, cuError = _f.error;
                    if (cuError) {
                        console.error('Error fetching coordinador usuario details:', cuError);
                    }
                    coordUsuariosList = cuData || [];
                    _g.label = 7;
                case 7:
                    coordUsuarioMap_1 = new Map((coordUsuariosList || []).map(function (u) { return [u.id, u]; }));
                    augmentedData = paginatedMilitantes.map(function (m) {
                        var usuarioAny = m.is_virtual ? {
                            nombres: m.nombres,
                            apellidos: m.apellidos,
                            numero_documento: m.numero_documento,
                            tipo_documento: m.tipo_documento,
                            celular: m.celular,
                            email: m.usuario_email,
                        } : usuariosMap_1.get(m.usuario_id) || null;
                        var perfilNombre = m.perfil_id ? perfilesMap_1.get(m.perfil_id) : null;
                        var coordUsuarioId = m.coordinador_id ? coordinadorToUsuarioMap_1.get(m.coordinador_id) : null;
                        var coordUsuarioAny = coordUsuarioId ? coordUsuarioMap_1.get(coordUsuarioId) : null;
                        var rawTipo = m.tipo;
                        var tipo_descripcion = null;
                        var tipo_codigo = null;
                        if (rawTipo !== undefined && rawTipo !== null) {
                            var byId = tiposData_1 && tiposData_1.find(function (t) { return String(t.id) === String(rawTipo); });
                            var byCodigo = tiposData_1 && tiposData_1.find(function (t) { return String(t.codigo) === String(rawTipo); });
                            if (byId) {
                                tipo_descripcion = byId.descripcion;
                                tipo_codigo = byId.codigo;
                            }
                            else if (byCodigo) {
                                tipo_descripcion = byCodigo.descripcion;
                                tipo_codigo = byCodigo.codigo;
                            }
                            else {
                                tipo_descripcion = m.tipo;
                                tipo_codigo = String(m.tipo);
                            }
                        }
                        return __assign(__assign({}, m), { militante_id: m.id, nombres: usuarioAny ? usuarioAny.nombres : null, apellidos: usuarioAny ? usuarioAny.apellidos : null, numero_documento: usuarioAny ? usuarioAny.numero_documento : null, tipo_documento: usuarioAny ? usuarioAny.tipo_documento : null, celular: usuarioAny ? usuarioAny.celular : null, usuario_email: usuarioAny ? usuarioAny.email : null, coordinador_nombre: coordUsuarioAny ? "".concat(coordUsuarioAny.nombres, " ").concat(coordUsuarioAny.apellidos) : null, perfil_nombre: perfilNombre || null, tipo_descripcion: tipo_descripcion, tipo_codigo: tipo_codigo });
                    });
                    return [2 /*return*/, server_1.NextResponse.json({
                            data: augmentedData,
                            count: totalCount,
                            page: page,
                            pageSize: pageSize,
                            totalPages: Math.ceil(totalCount / pageSize),
                        })];
                case 8:
                    error_1 = _g.sent();
                    console.error('Error en GET /api/militante:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Error interno del servidor: ".concat(error_1.message || error_1) }, { status: 500 })];
                case 9: return [2 /*return*/];
            }
        });
    });
}
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var adminClient, body, usuario_id, tipo, coordinador_id, compromiso_marketing, compromiso_cautivo, compromiso_impacto, compromiso_difusion, compromiso_proyecto, formulario, perfil_id, uuidRegex, _a, usuario, usuarioError, _b, coordinador, coordError, insertPayload, _c, militanteInsertRes, militanteError, militante, syncErr_1, error_2;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 11, , 12]);
                    adminClient = (0, server_2.createAdminClient)();
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _d.sent();
                    usuario_id = body.usuario_id, tipo = body.tipo, coordinador_id = body.coordinador_id, compromiso_marketing = body.compromiso_marketing, compromiso_cautivo = body.compromiso_cautivo, compromiso_impacto = body.compromiso_impacto, compromiso_difusion = body.compromiso_difusion, compromiso_proyecto = body.compromiso_proyecto, formulario = body.formulario, perfil_id = body.perfil_id;
                    // Validaciones básicas
                    if (!usuario_id || !tipo) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: 'Faltan campos requeridos: usuario_id y tipo son obligatorios'
                            }, { status: 400 })];
                    }
                    uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (!uuidRegex.test(usuario_id)) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: "usuario_id no tiene formato UUID v\u00E1lido: ".concat(usuario_id)
                            }, { status: 400 })];
                    }
                    // Sanitización de campos UUID vacíos
                    if (perfil_id === "")
                        perfil_id = null;
                    if (coordinador_id === "")
                        coordinador_id = null;
                    return [4 /*yield*/, adminClient
                            .from('usuarios')
                            .select('id, nombres, apellidos')
                            .eq('id', usuario_id)
                            .single()];
                case 2:
                    _a = _d.sent(), usuario = _a.data, usuarioError = _a.error;
                    if (usuarioError || !usuario) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })];
                    }
                    if (!coordinador_id) return [3 /*break*/, 4];
                    if (!uuidRegex.test(coordinador_id)) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: "coordinador_id no tiene formato UUID v\u00E1lido: ".concat(coordinador_id)
                            }, { status: 400 })];
                    }
                    return [4 /*yield*/, adminClient
                            .from('coordinadores')
                            .select('id')
                            .eq('id', coordinador_id)
                            .single()];
                case 3:
                    _b = _d.sent(), coordinador = _b.data, coordError = _b.error;
                    if (coordError || !coordinador) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Coordinador no encontrado' }, { status: 404 })];
                    }
                    _d.label = 4;
                case 4:
                    insertPayload = {
                        usuario_id: usuario_id,
                        tipo: tipo,
                        compromiso_marketing: compromiso_marketing !== null && compromiso_marketing !== void 0 ? compromiso_marketing : null,
                        compromiso_cautivo: compromiso_cautivo !== null && compromiso_cautivo !== void 0 ? compromiso_cautivo : null,
                        compromiso_impacto: compromiso_impacto !== null && compromiso_impacto !== void 0 ? compromiso_impacto : null,
                        compromiso_difusion: compromiso_difusion !== null && compromiso_difusion !== void 0 ? compromiso_difusion : null,
                        compromiso_proyecto: compromiso_proyecto !== null && compromiso_proyecto !== void 0 ? compromiso_proyecto : null,
                        formulario: formulario !== null && formulario !== void 0 ? formulario : null,
                    };
                    if (coordinador_id)
                        insertPayload.coordinador_id = coordinador_id;
                    if (perfil_id)
                        insertPayload.perfil_id = perfil_id;
                    return [4 /*yield*/, adminClient
                            .from('militantes')
                            .insert(insertPayload)
                            .select()]; // Add select to get back the created record
                case 5:
                    _c = _d.sent() // Add select to get back the created record
                    , militanteInsertRes = _c.data, militanteError = _c.error;
                    militante = (militanteInsertRes && Array.isArray(militanteInsertRes) && militanteInsertRes[0]) ? militanteInsertRes[0] : (militanteInsertRes || null);
                    if (militanteError) {
                        console.error('Error creando militante:', militanteError);
                        return [2 /*return*/, server_1.NextResponse.json({ error: militanteError.message }, { status: 500 })];
                    }
                    _d.label = 6;
                case 6:
                    _d.trys.push([6, 9, , 10]);
                    if (!usuario_id) return [3 /*break*/, 8];
                    return [4 /*yield*/, adminClient
                            .from('usuarios')
                            .update({
                            compromiso_marketing: compromiso_marketing != null ? Number(compromiso_marketing) : null,
                            compromiso_cautivo: compromiso_cautivo != null ? Number(compromiso_cautivo) : null,
                            compromiso_impacto: compromiso_impacto != null ? Number(compromiso_impacto) : null,
                        })
                            .eq('id', usuario_id)];
                case 7:
                    _d.sent();
                    _d.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    syncErr_1 = _d.sent();
                    console.error('Exception synchronizing usuario after creating militante:', syncErr_1);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/, server_1.NextResponse.json(militante, { status: 201 })];
                case 11:
                    error_2 = _d.sent();
                    console.error('Error en POST /api/militante:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Error interno del servidor: ".concat(error_2.message || error_2) }, { status: 500 })];
                case 12: return [2 /*return*/];
            }
        });
    });
}
function PATCH(request) {
    return __awaiter(this, void 0, void 0, function () {
        var adminClient, body, id, usuario_id, tipo, coordinador_id, compromiso_marketing, compromiso_cautivo, compromiso_impacto, compromiso_difusion, compromiso_proyecto, formulario, perfil_id, estado, uuidRegex, existingMilitante, militanteId, data, data, updatePayload, resultData, _a, data, updateErr, insertPayload, _b, data, insertErr, finalUsuarioId, userUpdateErr, syncErr_2, error_3;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 14, , 15]);
                    adminClient = (0, server_2.createAdminClient)();
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _c.sent();
                    id = body.id, usuario_id = body.usuario_id, tipo = body.tipo, coordinador_id = body.coordinador_id, compromiso_marketing = body.compromiso_marketing, compromiso_cautivo = body.compromiso_cautivo, compromiso_impacto = body.compromiso_impacto, compromiso_difusion = body.compromiso_difusion, compromiso_proyecto = body.compromiso_proyecto, formulario = body.formulario, perfil_id = body.perfil_id, estado = body.estado;
                    uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    existingMilitante = null;
                    militanteId = id;
                    if (!(militanteId && uuidRegex.test(militanteId))) return [3 /*break*/, 3];
                    return [4 /*yield*/, adminClient.from('militantes').select('*').eq('id', militanteId).single()];
                case 2:
                    data = (_c.sent()).data;
                    existingMilitante = data;
                    _c.label = 3;
                case 3:
                    if (!(!existingMilitante && usuario_id && uuidRegex.test(usuario_id))) return [3 /*break*/, 5];
                    return [4 /*yield*/, adminClient.from('militantes').select('*').eq('usuario_id', usuario_id).single()];
                case 4:
                    data = (_c.sent()).data;
                    if (data) {
                        existingMilitante = data;
                        militanteId = data.id;
                    }
                    _c.label = 5;
                case 5:
                    updatePayload = {};
                    if (tipo !== undefined)
                        updatePayload.tipo = tipo;
                    if (coordinador_id !== undefined)
                        updatePayload.coordinador_id = coordinador_id || null;
                    if (compromiso_marketing !== undefined)
                        updatePayload.compromiso_marketing = compromiso_marketing;
                    if (compromiso_cautivo !== undefined)
                        updatePayload.compromiso_cautivo = compromiso_cautivo;
                    if (compromiso_impacto !== undefined)
                        updatePayload.compromiso_impacto = compromiso_impacto;
                    if (compromiso_difusion !== undefined)
                        updatePayload.compromiso_difusion = compromiso_difusion;
                    if (compromiso_proyecto !== undefined)
                        updatePayload.compromiso_proyecto = compromiso_proyecto;
                    if (formulario !== undefined)
                        updatePayload.formulario = formulario;
                    if (perfil_id !== undefined)
                        updatePayload.perfil_id = perfil_id || null;
                    if (estado !== undefined)
                        updatePayload.estado = estado;
                    resultData = null;
                    if (!existingMilitante) return [3 /*break*/, 7];
                    return [4 /*yield*/, adminClient
                            .from('militantes')
                            .update(updatePayload)
                            .eq('id', militanteId)
                            .select()
                            .single()];
                case 6:
                    _a = _c.sent(), data = _a.data, updateErr = _a.error;
                    if (updateErr) {
                        console.error('Error actualizando militante:', updateErr);
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Error actualizando militante' }, { status: 500 })];
                    }
                    resultData = data;
                    return [3 /*break*/, 9];
                case 7:
                    // Create (Upsert case)
                    if (!usuario_id || !tipo) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Militante no encontrado y faltan datos para crear uno nuevo (usuario_id y tipo)' }, { status: 404 })];
                    }
                    insertPayload = __assign(__assign({}, updatePayload), { usuario_id: usuario_id, tipo: tipo || 'Sin tipo', estado: estado || 'activo' });
                    return [4 /*yield*/, adminClient
                            .from('militantes')
                            .insert(insertPayload)
                            .select()
                            .single()];
                case 8:
                    _b = _c.sent(), data = _b.data, insertErr = _b.error;
                    if (insertErr) {
                        console.error('Error creando militante en PATCH:', insertErr);
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Error creando militante' }, { status: 500 })];
                    }
                    resultData = data;
                    _c.label = 9;
                case 9:
                    _c.trys.push([9, 12, , 13]);
                    finalUsuarioId = usuario_id || resultData.usuario_id;
                    if (!finalUsuarioId) return [3 /*break*/, 11];
                    return [4 /*yield*/, adminClient.from('usuarios').update({
                            compromiso_marketing: compromiso_marketing != null ? Number(compromiso_marketing) : null,
                            compromiso_cautivo: compromiso_cautivo != null ? Number(compromiso_cautivo) : null,
                            compromiso_impacto: compromiso_impacto != null ? Number(compromiso_impacto) : null,
                        }).eq('id', finalUsuarioId)];
                case 10:
                    userUpdateErr = (_c.sent()).error;
                    if (userUpdateErr) {
                        console.error('Error sincronizando usuario tras salvar militante:', userUpdateErr);
                        // We don't rollback here to avoid complex state, but we log the error
                    }
                    _c.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    syncErr_2 = _c.sent();
                    console.error('Exception synchronizing usuario after saving militante:', syncErr_2);
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/, server_1.NextResponse.json(resultData)];
                case 14:
                    error_3 = _c.sent();
                    console.error('Error en PATCH /api/militante:', error_3);
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Error interno del servidor: ".concat(error_3.message || error_3) }, { status: 500 })];
                case 15: return [2 /*return*/];
            }
        });
    });
}
