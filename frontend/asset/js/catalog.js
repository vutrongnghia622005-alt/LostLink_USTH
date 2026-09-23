(function (root, factory) {
    const catalog = factory();
    if (typeof module === 'object' && module.exports) module.exports = catalog;
    if (root) root.LostLinkCatalog = catalog;
})(typeof window === 'undefined' ? null : window, function () {
    const categories = [
        'Giấy tờ tùy thân', 'Thiết bị điện tử', 'Chìa khóa & Thẻ từ',
        'Túi xách, balo', 'Ví, tiền bạc', 'Sách vở & Dụng cụ học tập',
        'Phụ kiện cá nhân', 'Quần áo', 'Thiết bị thể thao', 'Khác'
    ];
    const locations = [
        'A1', 'A2', 'A3', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14',
        'A16', 'A17', 'A18', 'A20', 'A21 - USTH', 'A22', 'A23', 'A25', 'A26', 'A27', 'A28',
        'A30', 'B1', 'B2', 'B3', 'B4', 'B5', '1H', '2H', '2A', '2B', '2C', 'Y tế',
        'Cổng 18', 'Cổng 18B', 'Cổng 18C', '789 Hoàng Quốc Việt', 'Khác'
    ];
    const categoryAliases = {
        'Sách vở': 'Sách vở & Dụng cụ học tập',
        'Phụ kiện': 'Phụ kiện cá nhân'
    };
    const locationAliases = {
        'Tòa A21 - USTH Main Building': 'A21 - USTH',
        'Tòa A21 - USTH': 'A21 - USTH',
        'Thư viện A11': 'A11',
        'Tòa A10 - CNTT': 'A10',
        'Tòa A10 - Tầng 4': 'A10',
        'Căng tin A2': 'A2',
        'Cổng 18 Hoàng Quốc Việt': 'Cổng 18'
    };
    function canonicalCategory(value) {
        return categoryAliases[value] || value;
    }
    function canonicalLocation(value) {
        return locationAliases[value] || value;
    }
    return { categories, locations, canonicalCategory, canonicalLocation };
});
