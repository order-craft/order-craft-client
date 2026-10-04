export async function fetchRawMaterials(apiCall) {
    const token = localStorage.getItem('token');
    return apiCall(
        '/raw-materials',
        'GET',
        null,
        { Authorization: `Bearer ${token}` }
    );
}