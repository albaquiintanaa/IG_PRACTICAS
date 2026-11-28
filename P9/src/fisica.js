import * as THREE from "three";

export const GRAVEDAD = 9.8;

const CF_KINEMATIC_OBJECT = 2;
const DISABLE_DEACTIVATION = 4;

let A = null; // módulo Ammo ya inicializado
let mundo = null;
let tmpTrans, tmpVec, tmpQuat;

const dinamicos = []; 
const cinematicos = [];

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();


export function initFisica(AmmoLib) {
  A = AmmoLib;
  const configuracion = new A.btDefaultCollisionConfiguration();
  const dispatcher = new A.btCollisionDispatcher(configuracion);
  const broadphase = new A.btDbvtBroadphase();
  const solver = new A.btSequentialImpulseConstraintSolver();
  mundo = new A.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, configuracion);
  mundo.setGravity(new A.btVector3(0, -GRAVEDAD, 0));

  tmpTrans = new A.btTransform();
  tmpVec = new A.btVector3(0, 0, 0);
  tmpQuat = new A.btQuaternion(0, 0, 0, 1);
  return mundo;
}

export const getAmmo = () => A;
export const getMundo = () => mundo;


// ---------- Formas de colisión ----------
export function formaCaja(sx, sy, sz, margen = 0.04) {
  const forma = new A.btBoxShape(new A.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
  forma.setMargin(margen);
  return forma;
}

export function formaEsfera(radio, margen = 0.04) {
  const forma = new A.btSphereShape(radio);
  forma.setMargin(margen);
  return forma;
}

export function formaCilindro(radio, alto, margen = 0.04) {
  const forma = new A.btCylinderShape(new A.btVector3(radio, alto * 0.5, radio));
  forma.setMargin(margen);
  return forma;
}


/*  masa = 0 y cinematico = false -> estático (suelo, paredes)
 *  masa > 0 -> dinámico (fichas, pelotas). 
 *  cinematico = true -> lo mueve el código/tween.
 */
export function crearCuerpoRigido(mesh, forma, masa, opciones = {}) {
  const {
    friccion = 0.5,
    restitucion = 0.0,
    velocidad = null,
    amortiguacion = null,
    cinematico = false,
  } = opciones;

  mesh.getWorldPosition(_pos);
  mesh.getWorldQuaternion(_quat);

  const transform = new A.btTransform();
  transform.setIdentity();
  tmpVec.setValue(_pos.x, _pos.y, _pos.z);
  transform.setOrigin(tmpVec);
  tmpQuat.setValue(_quat.x, _quat.y, _quat.z, _quat.w);
  transform.setRotation(tmpQuat);
  const motionState = new A.btDefaultMotionState(transform);

  const masaReal = cinematico ? 0 : masa;
  const inercia = new A.btVector3(0, 0, 0);
  if (masaReal > 0) forma.calculateLocalInertia(masaReal, inercia);

  const info = new A.btRigidBodyConstructionInfo(masaReal, motionState, forma, inercia);
  const cuerpo = new A.btRigidBody(info);

  A.destroy(info);
  A.destroy(inercia);
  A.destroy(transform);

  cuerpo.setFriction(friccion);
  cuerpo.setRestitution(restitucion);
  if (amortiguacion) cuerpo.setDamping(amortiguacion[0], amortiguacion[1]);
  if (velocidad) {
    tmpVec.setValue(velocidad.x, velocidad.y, velocidad.z);
    cuerpo.setLinearVelocity(tmpVec);
  }

  mesh.userData.cuerpoFisico = cuerpo;

  if (cinematico) {
    cuerpo.setCollisionFlags(cuerpo.getCollisionFlags() | CF_KINEMATIC_OBJECT);
    cuerpo.setActivationState(DISABLE_DEACTIVATION);
    cinematicos.push(mesh);
  } else if (masaReal > 0) {
    cuerpo.setActivationState(DISABLE_DEACTIVATION); //que no "se duerman"
    dinamicos.push(mesh);
  }

  mundo.addRigidBody(cuerpo);
  return cuerpo;
}


function sincronizarCinematicos() {
  for (const mesh of cinematicos) {
    mesh.getWorldPosition(_pos);
    mesh.getWorldQuaternion(_quat);
    tmpTrans.setIdentity();
    tmpVec.setValue(_pos.x, _pos.y, _pos.z);
    tmpTrans.setOrigin(tmpVec);
    tmpQuat.setValue(_quat.x, _quat.y, _quat.z, _quat.w);
    tmpTrans.setRotation(tmpQuat);
    mesh.userData.cuerpoFisico.getMotionState().setWorldTransform(tmpTrans);
  }
}


export function actualizarFisica(deltaTime) {
  sincronizarCinematicos();
  mundo.stepSimulation(deltaTime, 10);

  for (const mesh of dinamicos) {
    const ms = mesh.userData.cuerpoFisico.getMotionState();
    if (!ms) continue;
    ms.getWorldTransform(tmpTrans);
    const p = tmpTrans.getOrigin();
    const q = tmpTrans.getRotation();
    mesh.position.set(p.x(), p.y(), p.z());
    mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
  }
}


export function eliminar(mesh) {
  const cuerpo = mesh.userData.cuerpoFisico;
  if (cuerpo) {
    mundo.removeRigidBody(cuerpo);
    const forma = cuerpo.getCollisionShape();
    A.destroy(cuerpo.getMotionState());
    A.destroy(cuerpo);
    A.destroy(forma);
    delete mesh.userData.cuerpoFisico;
  }
  for (const lista of [dinamicos, cinematicos]) {
    const i = lista.indexOf(mesh);
    if (i >= 0) lista.splice(i, 1);
  }
  if (mesh.parent) mesh.parent.remove(mesh);
  if (!mesh.userData.geometriaCompartida) mesh.geometry && mesh.geometry.dispose();
}


export function recolocar(mesh) {
  const cuerpo = mesh.userData.cuerpoFisico;
  mesh.getWorldPosition(_pos);
  mesh.getWorldQuaternion(_quat);
  tmpTrans.setIdentity();
  tmpVec.setValue(_pos.x, _pos.y, _pos.z);
  tmpTrans.setOrigin(tmpVec);
  tmpQuat.setValue(_quat.x, _quat.y, _quat.z, _quat.w);
  tmpTrans.setRotation(tmpQuat);
  cuerpo.setWorldTransform(tmpTrans);
  cuerpo.getMotionState().setWorldTransform(tmpTrans);
  tmpVec.setValue(0, 0, 0);
  cuerpo.setLinearVelocity(tmpVec);
  cuerpo.setAngularVelocity(tmpVec);
}
