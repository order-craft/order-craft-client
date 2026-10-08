import { useState, useEffect } from "react";
import axios from "axios";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CSpinner,
  CButton,
  CBadge,
  CPagination,
  CPaginationItem,
  CFormSelect,
} from "@coreui/react";
import { cilStar, cilFilter, cilSearch } from "@coreui/icons";
import CIcon from "@coreui/icons-react";
import { BaseUrl } from "../../../helpers/BaseUrl";
import { useSelector } from "react-redux";
import translations from "../../../app/Language";

const ProductsRate = () => {
  const [productRatings, setProductRatings] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "rate",
    direction: "descending",
  });
  const [margins, setMargins] = useState({}); // productId -> margin info
  // language
  const t = useSelector((state) => state.language);
  const Language = translations[t];

  useEffect(() => {
    const fetchProductRatings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");

        const [ratingsRes, marginsRes] = await Promise.all([
          axios.get(`${BaseUrl}/products/rates`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BaseUrl}/dashboard/product-margins`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setProductRatings(ratingsRes.data);
        setFilteredProducts(ratingsRes.data);

        const marginsMap = {};
        (marginsRes.data || []).forEach((m) => {
          marginsMap[String(m.productId)] = m;
        });
        setMargins(marginsMap);
      } catch (error) {
        console.error("Failed to fetch product data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductRatings();
  }, []);

  // Filter products based on search term
  useEffect(() => {
    const filtered = productRatings.filter((product) =>
      product.productName.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, productRatings]);

  // Sorting functionality
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "ascending" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "ascending" ? 1 : -1;
    }
    return 0;
  });

  // Pagination
  const lastIndex = currentPage * itemsPerPage;
  const firstIndex = lastIndex - itemsPerPage;
  const currentProducts = sortedProducts.slice(firstIndex, lastIndex);
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return "success";
    if (rating >= 3) return "info";
    if (rating >= 2) return "warning";
    return "danger";
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" size="sm" />
        <p className="mt-3">{Language.loading}...</p>
      </div>
    );
  }

  return (
    <CCard className="dashboard-card">
      <CCardHeader className="dashboard-card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="dashboard-title">
            <CIcon icon={cilStar} className="me-2" />
            {Language.productsRating}
          </h3>
          <CBadge color="primary">
            {filteredProducts.length} {Language.products}
          </CBadge>
        </div>
      </CCardHeader>
      <CCardBody>
        <div className="d-flex justify-content-between mb-4">
          <div className="search-box">
            <div className="input-group">
              <span className="input-group-text">
                <CIcon icon={cilSearch} />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder={Language.searchProducts}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="d-flex">
            <CFormSelect
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="me-2"
              style={{ width: "80px" }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </CFormSelect>
            <CButton color="primary" variant="outline">
              <CIcon icon={cilFilter} className="me-1" />
              {Language.filter}
            </CButton>
          </div>
        </div>

        <div className="table-responsive">
          <CTable hover responsive striped>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell onClick={() => requestSort("productName")}>
                  {Language.productName}
                  {sortConfig.key === "productName" && (
                    <span className="ms-1">
                      {sortConfig.direction === "ascending" ? "↑" : "↓"}
                    </span>
                  )}
                </CTableHeaderCell>
                <CTableHeaderCell onClick={() => requestSort("rate")}>
                  {Language.rate}
                  {sortConfig.key === "rate" && (
                    <span className="ms-1">
                      {sortConfig.direction === "ascending" ? "↑" : "↓"}
                    </span>
                  )}
                </CTableHeaderCell>
                <CTableHeaderCell onClick={() => requestSort("raters")}>
                  {Language.numberOfRaters}
                  {sortConfig.key === "raters" && (
                    <span className="ms-1">
                      {sortConfig.direction === "ascending" ? "↑" : "↓"}
                    </span>
                  )}
                </CTableHeaderCell>
                <CTableHeaderCell onClick={() => requestSort("price")}>
                  {Language.price} (TND)
                  {sortConfig.key === "price" && (
                    <span className="ms-1">
                      {sortConfig.direction === "ascending" ? "↑" : "↓"}
                    </span>
                  )}
                </CTableHeaderCell>
                <CTableHeaderCell>
                  {Language.profit || "Profit"}
                </CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {currentProducts.length > 0 ? (
                currentProducts.map((product) => (
                  <CTableRow key={product.productId}>
                    <CTableDataCell className="fw-semibold">
                      {product.productName}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={getRatingColor(product.rate)}>
                        {product.rate.toFixed(2)} <CIcon icon={cilStar} />
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{product.raters}</CTableDataCell>
                    <CTableDataCell>
                      {product.price.toFixed(2)} TND
                    </CTableDataCell>
                    <CTableDataCell>
                      {(() => {
                        const m = margins[String(product.productId)];
                        if (!m) return <span className="text-muted">—</span>;
                        if (m.avgUnitCost == null)
                          return (
                            <CBadge
                              color="warning"
                              title={
                                Language.noRecipeAtOrderTime ||
                                "No recipe at order time"
                              }
                            >
                              {Language.noRecipe || "No recipe"}
                            </CBadge>
                          );
                        const marginColor =
                          m.marginPercent >= 40
                            ? "success"
                            : m.marginPercent >= 20
                              ? "info"
                              : "warning";
                        return (
                          <>
                            <CBadge color={marginColor}>
                              {m.marginPercent}%
                            </CBadge>
                            <div className="small text-muted">
                              {Number(m.profit).toFixed(2)} TND
                            </div>
                          </>
                        );
                      })()}
                    </CTableDataCell>
                  </CTableRow>
                ))
              ) : (
                <CTableRow>
                  <CTableDataCell colSpan="5" className="text-center py-4">
                    {Language.noProductsFound}
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-4">
          <div>
            {Language.showing} {firstIndex + 1}-
            {Math.min(lastIndex, filteredProducts.length)} {Language.of}{" "}
            {filteredProducts.length} {Language.products}
          </div>
          <CPagination>
            <CPaginationItem
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              aria-label="Previous"
            >
              <span aria-hidden="true">&laquo;</span>
            </CPaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <CPaginationItem
                  key={pageNum}
                  active={pageNum === currentPage}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </CPaginationItem>
              );
            })}
            <CPaginationItem
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              aria-label="Next"
            >
              <span aria-hidden="true">&raquo;</span>
            </CPaginationItem>
          </CPagination>
        </div>
      </CCardBody>
    </CCard>
  );
};

export default ProductsRate;
