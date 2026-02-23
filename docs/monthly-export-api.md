# Monthly Excel Export API Documentation

## Overview
This API allows customers (sales persons) to generate monthly Excel reports filtered by their name and a specific month.

## Endpoint
```
GET /api/customer/monthly-excel
```

## Query Parameters

| Parameter | Type   | Required | Format    | Description                           |
|-----------|--------|----------|-----------|---------------------------------------|
| month     | string | Yes      | YYYY-MM   | Month for filtering (e.g., 2024-03)  |
| sales     | string | Yes      | text      | Sales person name                     |
| password  | string | Yes      | text      | Authentication password               |

## Authentication
- Uses password-based authentication
- Password must be configured in `.env` file as `{SALES_NAME}_PASSWORD`
- Example: For sales person "John Doe", env variable should be `JOHN_DOE_PASSWORD`

## Request Example

### Using Browser/Postman
```
GET http://localhost:5000/api/customer/monthly-excel?month=2024-03&sales=John%20Doe&password=yourpassword
```

### Using JavaScript Fetch
```javascript
const month = "2024-03";
const sales = "John Doe";
const password = "yourpassword";

const url = `/api/customer/monthly-excel?month=${encodeURIComponent(month)}&sales=${encodeURIComponent(sales)}&password=${encodeURIComponent(password)}`;

fetch(url)
  .then(response => {
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  })
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer_Report_${sales.replace(/\s+/g, '_')}_${month}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  })
  .catch(error => console.error('Error:', error));
```

### Using Axios
```javascript
import axios from 'axios';

const downloadMonthlyReport = async (month, sales, password) => {
  try {
    const response = await axios.get('/api/customer/monthly-excel', {
      params: { month, sales, password },
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Customer_Report_${sales.replace(/\s+/g, '_')}_${month}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Download failed:', error.response?.data || error.message);
  }
};

// Usage
downloadMonthlyReport('2024-03', 'John Doe', 'yourpassword');
```

## Response

### Success (200 OK)
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="Customer_Report_{sales}_{month}.xlsx"`
- Body: Excel file binary data

### Error Responses

#### 400 Bad Request - Invalid Month Format
```json
{
  "error": "Invalid month format. Use YYYY-MM (e.g., 2024-03)"
}
```

#### 400 Bad Request - Missing Parameters
```json
{
  "error": "Sales person name and password are required"
}
```

#### 401 Unauthorized - Invalid Password
```json
{
  "error": "Invalid password"
}
```

#### 404 Not Found - No Password Configured
```json
{
  "error": "No password configured for \"John Doe\""
}
```

#### 404 Not Found - No Data
```json
{
  "error": "No data found for John Doe in 2024-03"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to generate monthly report",
  "details": "Error message details"
}
```

## Excel File Format

The generated Excel file includes:

### Structure
- Title row: "Monthly Report - {Sales Name} - {Month}"
- Header row with all column names (frozen)
- Data rows with all application records

### Columns
Same as Master Excel format:
- Login Information (S.No, Code, Name, Mobile, Product, etc.)
- Remarks (merged with Consulting, Payout, Expense, Fees Refund)
- Status Information (PD Status, PD Remark, etc.)
- Disbursement Information (Sanction Date, Amount, etc.)
- Part Disbursed Details

### Features
- Frozen header row for easy scrolling
- Auto-fitted column widths
- Text wrapping for long content
- Proper date formatting (DD-MM-YYYY)
- Currency formatting for amounts
- Borders on all cells

## Filtering Logic

The API filters records by:
1. **Sales Person**: Exact match with the `sales` field
2. **Month**: Matches records where `loginDate` falls within the specified month
   - Supports multiple date formats:
     - ISO format: `YYYY-MM-DD`
     - Indian format: `DD-MM-YYYY`
     - Date objects

## Environment Configuration

Add sales person passwords to `.env`:

```env
# Sales Person Passwords
JOHN_DOE_PASSWORD=password123
JANE_SMITH_PASSWORD=securepass456
SALES_TEAM_PASSWORD=teampass789
```

**Note**: 
- Spaces in names are replaced with underscores
- Special characters are removed
- Names are converted to uppercase

## Security Considerations

1. **Password Protection**: Each sales person has their own password
2. **No File Storage**: Excel files are streamed directly to the client (not saved on server)
3. **Data Isolation**: Users can only access their own data
4. **Input Validation**: Month format and required parameters are validated

## Limitations

- Maximum records: No hard limit, but large datasets may take longer to generate
- Date format: Must be YYYY-MM for the month parameter
- Authentication: Password-based only (no JWT/session support yet)

## Future Enhancements

- [ ] Add JWT/session-based authentication
- [ ] Support date range filtering (start date to end date)
- [ ] Add pagination for large datasets
- [ ] Support multiple sales persons in one report
- [ ] Add summary statistics at the top of the report
- [ ] Email delivery option

## Testing

### Test Cases

1. **Valid Request**
   ```
   GET /api/customer/monthly-excel?month=2024-03&sales=John%20Doe&password=correctpass
   Expected: 200 OK with Excel file
   ```

2. **Invalid Month Format**
   ```
   GET /api/customer/monthly-excel?month=03-2024&sales=John%20Doe&password=correctpass
   Expected: 400 Bad Request
   ```

3. **Wrong Password**
   ```
   GET /api/customer/monthly-excel?month=2024-03&sales=John%20Doe&password=wrongpass
   Expected: 401 Unauthorized
   ```

4. **No Data Found**
   ```
   GET /api/customer/monthly-excel?month=2024-12&sales=John%20Doe&password=correctpass
   Expected: 404 Not Found (if no records exist)
   ```

5. **Missing Parameters**
   ```
   GET /api/customer/monthly-excel?month=2024-03
   Expected: 400 Bad Request
   ```

## Support

For issues or questions, contact the development team.
