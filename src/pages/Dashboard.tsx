export function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold mb-2">Inventario Total</h3>
          <p className="text-3xl font-bold text-orange-600">--</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold mb-2">Órdenes Pendientes</h3>
          <p className="text-3xl font-bold text-orange-600">--</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold mb-2">Alertas</h3>
          <p className="text-3xl font-bold text-orange-600">--</p>
        </div>
      </div>
    </div>
  );
}